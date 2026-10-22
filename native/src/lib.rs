use napi::bindgen_prelude::{Buffer, Error, Result, Status};
use napi_derive::napi;
use typst::{
    diag::{FileError, FileResult},
    foundations::{Bytes, Datetime, Duration},
    syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot},
    text::{Font, FontBook},
    utils::{LazyHash, Scalar},
    Library, LibraryExt, World,
};
use typst_layout::{Page, PagedDocument};

#[napi(object)]
pub struct RenderRequest {
    pub latex: String,
    pub scale: Option<f64>,
    pub foreground: Option<String>,
    pub background: Option<String>,
    pub display: Option<bool>,
    pub cell_width: Option<f64>,
    pub cell_height: Option<f64>,
    pub compact: Option<bool>,
    /// Keep the standard text size instead of scaling the formula down to the
    /// single text row it shares with the prose around it.
    pub standard: Option<bool>,
}

#[napi(object)]
pub struct RenderedMath {
    pub png: Buffer,
    pub pixel_width: u32,
    pub pixel_height: u32,
    pub baseline: f64,
    /// Whether the raster was scaled below the standard text size to fit a text
    /// row. A formula that was not scaled can keep that size.
    pub clamped: bool,
}

struct MemoryWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    main: FileId,
    source: Source,
    fonts: Vec<Font>,
}

impl MemoryWorld {
    fn new(source: String) -> Self {
        let mut book = FontBook::new();
        let mut fonts = vec![];

        for data in typst_assets::fonts() {
            for font in Font::iter(Bytes::new(data)) {
                book.push(font.info().clone());
                fonts.push(font);
            }
        }

        let path = VirtualPath::new("math.typ").expect("the math path is valid");
        let main = FileId::new(RootedPath::new(VirtualRoot::Project, path));
        Self {
            library: LazyHash::new(Library::default()),
            book: LazyHash::new(book),
            main,
            source: Source::new(main, source),
            fonts,
        }
    }
}

impl World for MemoryWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.main
    }

    // The renderer handles one expression and deliberately has no filesystem or
    // package access. That makes every render deterministic and in-process.
    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.main {
            Ok(self.source.clone())
        } else {
            Err(FileError::AccessDenied)
        }
    }

    fn file(&self, _: FileId) -> FileResult<Bytes> {
        Err(FileError::AccessDenied)
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, _: Option<Duration>) -> Option<Datetime> {
        None
    }
}

// The page is laid out at this size in points. A render scale of
// `cell_height / FONT_SIZE_PT` then puts one em at one terminal cell height.
const FONT_SIZE_PT: f64 = 12.0;

// Geometry shared with the SVG reference implementation. A terminal cell is about
// twice as tall as it is wide, so one text em spans two columns and one row.
const TEXT_COLUMNS: f64 = 2.0;
const TEXT_BASELINE: f64 = 0.75;
// Empty rows charged above the ink so the anti-aliased edge of the tallest glyph
// is never clipped by the box. Compact math, which only ever occupies one row,
// can afford less.
const BLEED: f64 = 0.08;
const COMPACT_PADDING: f64 = 0.04;
const INLINE_GLYPH_SCALE: f64 = 1.02;

// A tight page (margin 0) is exactly the text line box, so an inline formula whose
// ink overflows that box — an integral, a summation with limits — is clipped at
// the page edge. A generous margin lets the whole ink rasterize; the ink is then
// measured back out of the raster, so the margin never reaches the terminal box.
const PAGE_MARGIN_PT: f64 = FONT_SIZE_PT * 6.0;

// A page laid out from inline math flattens the line into direct glyph items, so
// the line's baseline is not recoverable from the frame tree. Instead the formula
// shares its line with a small sentinel glyph (a Latin `x`, which has no
// descender and rests on the baseline) drawn in a color distinct from both the
// ink and the fill. Scanning for that color locates the true text baseline.
//
// MiTeX converts LaTeX into Typst *code*, and that code calls helper functions
// for every LaTeX command Typst has no one-to-one equivalent for (`mitexsqrt`,
// `mitexdisplay`, `pmatrix`, ...). Those helpers are the host's job: the scope
// below is the official MiTeX scope (mitex-rs/mitex, `packages/mitex/specs/
// latex/standard.typ`, Apache-2.0), reduced to the handlers Typst 0.15 does not
// provide on its own.
const MITEX_SCOPE: &str = r#"
#let mitexsqrt(..args) = {
  let p = args.pos()
  if p.len() == 1 { math.sqrt(p.at(0)) }
  else { math.root(p.at(0).children.filter(it => it != [\[] and it != [\]]).sum(), p.at(1)) }
}
#let mitexdisplay(body) = math.display(body)
#let mitexinline(body) = math.inline(body)
#let mitexscript(body) = math.script(body)
#let mitexsscript(body) = math.sscript(body)
#let mitexbold(body) = math.bold(math.upright(body))
#let mitexupright(body) = math.upright(body)
#let mitexitalic(body) = math.italic(body)
#let mitexsans(body) = math.sans(body)
#let mitexfrak(body) = math.frak(body)
#let mitexmono(body) = math.mono(body)
#let mitexcal(body) = math.cal(body)
#let mitexmathbf(body) = math.bold(math.upright(body))
#let textmath(body) = body
#let textmd(body) = body
#let textnormal(body) = body
#let textbf(body) = math.bold(body)
#let textit(body) = math.italic(body)
#let textrm(body) = math.upright(body)
#let textup(body) = math.upright(body)
#let textsf(body) = math.sans(body)
#let texttt(body) = math.mono(body)
#let operatorname(body) = math.op(math.upright(body))
#let operatornamewithlimits(body) = math.op(limits: true, math.upright(body))
#let middle(body) = math.mid(body)
#let big(body) = math.lr(size: 1.2em, body)
#let Big(body) = math.lr(size: 1.8em, body)
#let bigg(body) = math.lr(size: 2.4em, body)
#let Bigg(body) = math.lr(size: 3em, body)
#let phantom(body) = hide(body)
#let hphantom(body) = box(height: 0pt, hide(body))
#let vphantom(body) = box(width: 0pt, hide(body))
#let dfrac(a, b) = math.display(math.frac(a, b))
#let tfrac(a, b) = math.inline(math.frac(a, b))
#let cfrac(a, b) = math.display(math.frac(a, b))
#let dbinom(a, b) = math.display(math.binom(a, b))
#let tbinom(a, b) = math.inline(math.binom(a, b))
#let substack(body) = body
#let overset(sup, base) = $limits(#base)^(#sup)$
#let underset(sub, base) = $limits(#base)_(#sub)$
#let stackrel(sup, base) = $limits(#base)^(#sup)$
#let boxed(body) = box(stroke: 0.5pt, inset: 6pt, $body$)
#let pmatrix(..args) = math.mat(delim: "(", ..args.pos())
#let bmatrix(..args) = math.mat(delim: "[", ..args.pos())
#let Bmatrix(..args) = math.mat(delim: "{", ..args.pos())
#let vmatrix(..args) = math.mat(delim: "|", ..args.pos())
#let Vmatrix(..args) = math.mat(delim: "||", ..args.pos())
#let matrix(..args) = math.mat(delim: none, ..args.pos())
#let smallmatrix(..args) = math.inline(math.mat(delim: none, ..args.pos()))
#let aligned(body) = math.op(body)
#let alignedat(body) = math.op(body)
#let mitexarray(arg0: none, ..args) = {
  if args.pos().len() == 0 { return [] }
  let columns = if type(arg0) == str {
    (arg0,)
  } else if arg0.has("children") {
    arg0.children.filter(it => it != [ ] and it != [#math.zws]).map(it => it.text).filter(it => it == "l" or it == "c" or it == "r")
  } else {
    (arg0.text,)
  }
  // The converter writes the cells of one row as separate arguments and
  // separates the rows with `;`, which arrives as a single array of rows.
  let rows = if args.pos().len() == 1 and type(args.pos().at(0)) == array {
    args.pos().at(0)
  } else {
    (args.pos(),)
  }
  let width = calc.max(..rows.map(row => row.len()))
  let cells = rows.map(row => row + (width - row.len()) * (none,)).flatten()
  let align-map = ("l": left, "c": center, "r": right)
  set align(if columns.len() == 0 { center } else { align-map.at(columns.at(0)) })
  grid(
    columns: width,
    column-gutter: 0.5em,
    row-gutter: 0.5em,
    ..cells.map(cell => $cell$),
  )
}
#let mitexunderbrace(body) = math.underbrace(body)
#let mitexoverbrace(body) = math.overbrace(body)
#let mitexunderbracket(body) = math.underbracket(body)
#let mitexoverbracket(body) = math.overbracket(body)
#let xrightarrow(body) = $limits(stretch(#math.arrow.r)^#body)$
#let xleftarrow(body) = $limits(stretch(#math.arrow.l)^#body)$
#let xleftrightarrow(body) = $limits(stretch(#math.arrow.l.r)^#body)$
#let xRightarrow(body) = $limits(stretch(#math.arrow.r.double)^#body)$
#let xLeftarrow(body) = $limits(stretch(#math.arrow.l.double)^#body)$
#let xLeftrightarrow(body) = $limits(stretch(#math.arrow.l.r.double)^#body)$
#let mitexlabel(..args) = []
#let mitexcite(..args) = []
#let mitexref(..args) = []
"#;

// `display` math is typeset in Typst's display style, where large operators
// carry their limits above and below instead of beside them.
fn math_source(math: &str, foreground: &str, background: &str, sentinel: &str, display: bool) -> String {
    let body = if display { format!("display({math})") } else { math.to_string() };
    format!(
        "#set page(width: auto, height: auto, margin: {PAGE_MARGIN_PT}pt, fill: rgb(\"{background}\"))\n#set text(size: {FONT_SIZE_PT}pt, fill: rgb(\"{foreground}\"))\n{MITEX_SCOPE}\n#text(fill: rgb(\"{sentinel}\"))[x]#h(6em)${body}$"
    )
}

fn compile_page(source: String) -> std::result::Result<Page, String> {
    let world = MemoryWorld::new(source);
    let warned = typst::compile::<PagedDocument>(&world);
    for warning in warned.warnings.iter() {
        eprintln!("[opentui-markdown-render] {warning:?}");
    }
    let document = warned.output.map_err(|errors| format!("{errors:?}"))?;
    document.pages().first().cloned().ok_or_else(|| "Typst produced no page".into())
}

// A formula the display-style wrapper cannot parse - a stray top-level comma,
// say - still renders in text style instead of falling back to the source.
fn compile_math_page(
    math: &str,
    foreground: &str,
    background: &str,
    display: bool,
) -> std::result::Result<Page, String> {
    let source = math_source(math, foreground, background, SENTINEL_HEX, display);
    match compile_page(source) {
        Ok(page) => Ok(page),
        Err(error) if display => {
            eprintln!("[opentui-markdown-render] display style failed, using text style: {error}");
            compile_page(math_source(math, foreground, background, SENTINEL_HEX, false))
        }
        Err(error) => Err(error),
    }
}

// The page carries the fill that the terminal background is baked into, so the
// raster is opaque and matches the theme it is drawn on.
fn render_page(page: &Page, scale: f64) -> tiny_skia::Pixmap {
    typst_render::render(
        page,
        &typst_render::RenderOptions {
            pixel_per_pt: Scalar::new(scale),
            render_bleed: false,
        },
    )
}

fn hex_rgb(hex: &str) -> (u8, u8, u8) {
    let pair = |start: usize| u8::from_str_radix(&hex[start..start + 2], 16).unwrap_or(0);
    if hex.len() == 3 {
        let mut iter = hex.bytes();
        let digit = |byte: u8| {
            let value = (byte as char).to_digit(16).unwrap_or(0) as u8;
            value * 16 + value
        };
        (digit(iter.next().unwrap()), digit(iter.next().unwrap()), digit(iter.next().unwrap()))
    } else {
        (pair(0), pair(2), pair(4))
    }
}

fn channel_distance(a: (u8, u8, u8), b: (u8, u8, u8)) -> i32 {
    (a.0 as i32 - b.0 as i32).abs() + (a.1 as i32 - b.1 as i32).abs() + (a.2 as i32 - b.2 as i32).abs()
}

fn is_ink(pixel: (u8, u8, u8), background: (u8, u8, u8)) -> bool {
    channel_distance(pixel, background) > 8
}

// The sentinel glyph is only a positional marker: it is sliced off spatially, so
// its color never affects the result and any value distinct from the fill works.
const SENTINEL_HEX: &str = "ff00ff";

struct InkBox {
    left: u32,
    top: u32,
    right: u32,
    bottom: u32,
}

struct Regions {
    math: Option<InkBox>,
    sentinel: Option<InkBox>,
    split: u32,
}

fn extend(bounds: &mut InkBox, x: u32, y: u32) {
    bounds.left = bounds.left.min(x);
    bounds.right = bounds.right.max(x);
    bounds.top = bounds.top.min(y);
    bounds.bottom = bounds.bottom.max(y);
}

// The page lays the sentinel glyph and the formula on one line, separated by a
// wide `#h` gap, so the ink splits at the single largest empty column run:
// everything to its left is the sentinel, everything to its right is the formula.
// This needs no color model, so it survives any theme palette, and it recovers
// the formula's true bounding box however far its ink overflows the text line box
// it was laid out in. `min_gap` is the separator width in pixels; a longest run
// shorter than that means the two are not distinguishable and the whole raster is
// treated as the formula.
fn measure_regions(image: &tiny_skia::Pixmap, background: (u8, u8, u8), min_gap: u32) -> Regions {
    let width = image.width();
    let height = image.height();
    let data = image.data();
    let mut column_has_ink = vec![false; width as usize];
    let mut any_ink = false;
    for y in 0..height {
        for x in 0..width {
            let index = ((y * width + x) * 4) as usize;
            if is_ink((data[index], data[index + 1], data[index + 2]), background) {
                column_has_ink[x as usize] = true;
                any_ink = true;
            }
        }
    }
    if !any_ink {
        return Regions { math: None, sentinel: None, split: 0 };
    }
    let first = column_has_ink.iter().position(|value| *value).unwrap_or(0) as u32;
    let last = column_has_ink.iter().rposition(|value| *value).unwrap_or(0) as u32;

    let mut best_gap = 0;
    let mut best_start = 0;
    let mut run_start = 0;
    let mut in_gap = false;
    for x in first..=last {
        if column_has_ink[x as usize] {
            in_gap = false;
            continue;
        }
        if !in_gap {
            in_gap = true;
            run_start = x;
        }
        let run = x - run_start + 1;
        if run > best_gap {
            best_gap = run;
            best_start = run_start;
        }
    }
    let split = if best_gap >= min_gap { best_start + best_gap / 2 } else { first };

    let mut math = InkBox { left: width, top: height, right: 0, bottom: 0 };
    let mut glyph = InkBox { left: width, top: height, right: 0, bottom: 0 };
    let mut math_found = false;
    let mut glyph_found = false;
    for y in 0..height {
        for x in 0..width {
            let index = ((y * width + x) * 4) as usize;
            if !is_ink((data[index], data[index + 1], data[index + 2]), background) {
                continue;
            }
            if x < split {
                glyph_found = true;
                extend(&mut glyph, x, y);
            } else {
                math_found = true;
                extend(&mut math, x, y);
            }
        }
    }
    Regions { math: math_found.then_some(math), sentinel: glyph_found.then_some(glyph), split }
}

// The sentinel `x` has no descender and rests on the baseline, so the row below
// its last inked row is the text baseline. A faint anti-aliased row can push it
// down by at most a pixel.
fn region_baseline(sentinel: &InkBox) -> f64 {
    sentinel.bottom as f64 + 1.0
}

// Copy the margin-padded source raster into the box at the given offset, clipping
// anything outside it. Fill pixels are a no-op (they match the box) and the
// sentinel glyph (everything left of `split`) is dropped.
fn blit(
    source: &tiny_skia::Pixmap,
    destination: &mut tiny_skia::Pixmap,
    offset_x: i64,
    offset_y: i64,
    background: (u8, u8, u8),
    split: u32,
) {
    let source_width = source.width() as i64;
    let source_height = source.height() as i64;
    let destination_width = destination.width() as i64;
    let destination_height = destination.height() as i64;
    let source_data = source.data();
    let destination_data = destination.data_mut();
    for source_y in 0..source_height {
        let destination_y = source_y + offset_y;
        if destination_y < 0 || destination_y >= destination_height {
            continue;
        }
        for source_x in 0..source_width {
            if source_x < split as i64 {
                continue;
            }
            let destination_x = source_x + offset_x;
            if destination_x < 0 || destination_x >= destination_width {
                continue;
            }
            let from = ((source_y * source_width + source_x) * 4) as usize;
            if !is_ink((source_data[from], source_data[from + 1], source_data[from + 2]), background) {
                continue;
            }
            let to = ((destination_y * destination_width + destination_x) * 4) as usize;
            destination_data[to..to + 4].copy_from_slice(&source_data[from..from + 4]);
        }
    }
}

// The `#h(6em)` separator between the sentinel and the formula, in pixels. Real
// formulas contain no empty run anywhere near this wide, so it marks the slice.
fn sentinel_gap_px(scale: f64) -> u32 {
    (FONT_SIZE_PT * 3.0 * scale).round().max(4.0) as u32
}

fn blank_box(cell_width: u32, cell_height: u32, min_rows: u32, background: (u8, u8, u8)) -> Option<tiny_skia::Pixmap> {
    let box_width = cell_width.max(1);
    let box_height = cell_height.max(1) * min_rows.max(1);
    let mut box_image = tiny_skia::Pixmap::new(box_width, box_height)?;
    let (red, green, blue) = background;
    for pixel in box_image.data_mut().chunks_exact_mut(4) {
        pixel.copy_from_slice(&[red, green, blue, 255]);
    }
    Some(box_image)
}

// The terminal's `fit` maps the raster onto the cell box 1:1 only when the two
// share an aspect ratio, so the raster is padded to exactly `columns * cell_width`
// by `rows * cell_height`. The formula's true ink metrics are measured from a
// margin-padded page, then the same rows/columns/baseline arithmetic the SVG
// reference uses places the ink on the shared text baseline. Inline formulas that
// would otherwise overflow one text row are scaled down to fit it; genuinely tall
// ones keep a multi-row box; compact math is scaled into a single text row.
struct Rendered {
    png: Vec<u8>,
    width: u32,
    height: u32,
    baseline: f64,
    clamped: bool,
}

fn render_math_png(
    latex: String,
    scale: f32,
    foreground: String,
    background: String,
    display: bool,
    cell_width: f32,
    cell_height: f32,
    compact: bool,
    standard: bool,
) -> std::result::Result<Rendered, String> {
    // Display-math delimiters own the surrounding newlines, and a formula whose
    // raw text still carries them is a multiline math expression inside the
    // sentinel template. That changes the line box enough to defeat the widest-gap
    // split (the sentinel leaks beside the formula), so the math is normalized to
    // a single expression before layout.
    let math = mitex::convert_math(latex.trim(), None).map_err(|error| error.to_string())?;
    let foreground = normalize_color(&foreground)?;
    let background = normalize_color(&background)?;

    let cell_width = cell_width.round().max(1.0) as f64;
    let cell_height = cell_height.round().max(1.0) as f64;
    let background_rgb = hex_rgb(background);
    let min_rows: u32 = if display { 3 } else { 1 };

    // `scale` is the caller's points-to-pixels factor; separate the text-relative
    // base (one em per cell height) from the caller's own enlargement so the two
    // can be reasoned about independently.
    let base_scale = cell_height / FONT_SIZE_PT;
    let user_scale = (scale as f64) * FONT_SIZE_PT / cell_height;
    let em_px = FONT_SIZE_PT * base_scale;

    // Pass 1: measure the ink at text size on the margin-padded page.
    let measuring = compile_math_page(&math, foreground, background, display)?;
    let measured = render_page(&measuring, base_scale);
    let regions = measure_regions(&measured, background_rgb, sentinel_gap_px(base_scale));
    let Some(ink) = regions.math else {
        // An empty formula draws nothing; reserve one text row so the flow stays
        // stable, with the baseline where text beside it would sit.
        let box_image = blank_box(cell_width as u32, cell_height as u32, min_rows, background_rgb)
            .ok_or("Typst produced an empty page")?;
        let baseline = if display {
            (box_image.height() as f64) / 2.0
        } else {
            TEXT_BASELINE * cell_height
        };
        let png = box_image.encode_png().map_err(|error| error.to_string())?;
        return Ok(Rendered { png, width: box_image.width(), height: box_image.height(), baseline, clamped: false });
    };
    let measured_baseline = regions
        .sentinel
        .as_ref()
        .map(region_baseline)
        .unwrap_or_else(|| ink.top as f64 + TEXT_BASELINE * em_px);
    let em_above = ((measured_baseline - ink.top as f64) / em_px).max(0.0);
    let em_below = (((ink.bottom + 1) as f64 - measured_baseline) / em_px).max(0.0);
    let em_width = ((ink.right - ink.left + 1) as f64 / em_px).max(0.0);


    // One em is two columns and (because a cell is twice as tall as wide) two rows
    // tall, so `em_columns / aspect` converts em measurements into text rows.
    let aspect = cell_height / cell_width;
    let em_height = em_above + em_below;
    // Near-text-height formulas are rescaled just enough to land inside the single
    // text row they share with the surrounding prose; taller ones keep their box.
    // A formula that stands alone in its line shares the row with nothing, so it
    // keeps the standard text size instead.
    let inline_columns = if standard || em_height > 1.1 {
        TEXT_COLUMNS
    } else {
        TEXT_COLUMNS.min(((1.0 - BLEED - 0.01) * aspect) / (TEXT_BASELINE.max(em_above) + em_below))
    };
    let clamped = inline_columns < TEXT_COLUMNS;
    let em_columns = if display { TEXT_COLUMNS * user_scale } else { inline_columns };
    let ink_above_rows = em_above * (em_columns / aspect);
    let ink_below_rows = em_below * (em_columns / aspect);
    let padding = if compact && !display { COMPACT_PADDING } else { BLEED };
    let glyph_scale = if compact && !display {
        INLINE_GLYPH_SCALE
            .min((TEXT_BASELINE - padding) / ink_above_rows)
            .min((1.0 - TEXT_BASELINE - padding) / ink_below_rows)
    } else {
        INLINE_GLYPH_SCALE
    };
    let baseline_rows = if compact && !display {
        TEXT_BASELINE
    } else {
        let above = if display { em_above } else { TEXT_BASELINE.max(em_above) };
        above * (em_columns / aspect)
    };
    let ink_bottom = baseline_rows + ink_below_rows * glyph_scale;
    let rows = if compact && !display {
        1.0
    } else {
        (ink_bottom + padding).ceil().max(min_rows as f64)
    };
    let columns = (em_width * em_columns * if compact && !display { glyph_scale } else { 1.0 }).ceil().max(1.0);
    let returned_baseline_rows = baseline_rows + padding;
    // The raster draws the glyphs at `em_columns * cell_width` pixels per em, and
    // compact/the inline clamp shrink them further by `glyph_scale`. Display math
    // is never glyph-scaled in the reference, so it draws at its true size.
    let glyph_effective = if display { 1.0 } else { glyph_scale };
    let render_scale = em_columns * cell_width * glyph_effective / FONT_SIZE_PT;

    // Pass 2: rasterize at the computed size and place the ink on the box baseline.
    let drawing = compile_math_page(&math, foreground, background, display)?;
    let image = render_page(&drawing, render_scale);
    let drawn = measure_regions(&image, background_rgb, sentinel_gap_px(render_scale));
    let drawn_em_px = FONT_SIZE_PT * render_scale;
    let drawn_baseline = drawn
        .sentinel
        .as_ref()
        .map(region_baseline)
        .unwrap_or_else(|| drawn.math.as_ref().map(|value| value.top as f64 + TEXT_BASELINE * drawn_em_px).unwrap_or(0.0));

    let box_width = (columns as u32) * (cell_width as u32);
    let box_height = (rows as u32) * (cell_height as u32);
    let box_width = box_width.max(1);
    let box_height = box_height.max(1);

    // Centre the visible ink horizontally and drop the formula baseline onto
    // `returned_baseline_rows`, where the surrounding text's own baseline sits.
    let ink_center = drawn
        .math
        .as_ref()
        .map(|value| (value.left as f64 + value.right as f64 + 1.0) / 2.0)
        .unwrap_or(image.width() as f64 / 2.0);
    let offset_x = (box_width as f64 / 2.0 - ink_center).round() as i64;
    let offset_y = (returned_baseline_rows * cell_height).round() as i64 - drawn_baseline.round() as i64;

    let (red, green, blue) = background_rgb;
    let mut padded = tiny_skia::Pixmap::new(box_width, box_height).ok_or("Typst produced an empty page")?;
    for pixel in padded.data_mut().chunks_exact_mut(4) {
        pixel.copy_from_slice(&[red, green, blue, 255]);
    }
    blit(&image, &mut padded, offset_x, offset_y, background_rgb, drawn.split);

    let baseline = offset_y as f64 + drawn_baseline;
    let png = padded.encode_png().map_err(|error| error.to_string())?;
    Ok(Rendered { png, width: box_width, height: box_height, baseline, clamped })
}

fn normalize_color(value: &str) -> std::result::Result<&str, String> {
    let hex = value.strip_prefix('#').unwrap_or(value);
    if (hex.len() == 3 || hex.len() == 6) && hex.bytes().all(|character| character.is_ascii_hexdigit()) {
        return Ok(hex);
    }
    Err("Math colors must be three- or six-digit hexadecimal values".into())
}

#[napi]
pub async fn render_latex(request: RenderRequest) -> Result<RenderedMath> {
    let scale = request.scale.unwrap_or(2.0).clamp(0.5, 8.0) as f32;
    let foreground = request.foreground.unwrap_or_else(|| "000000".into());
    let background = request.background.unwrap_or_else(|| "ffffff".into());
    let display = request.display.unwrap_or(false);
    let cell_width = request.cell_width.unwrap_or(8.0) as f32;
    let cell_height = request.cell_height.unwrap_or(16.0) as f32;
    let compact = request.compact.unwrap_or(false);
    let standard = request.standard.unwrap_or(false);
    let rendered = napi::tokio::task::spawn_blocking(move || {
        render_math_png(
            request.latex,
            scale,
            foreground,
            background,
            display,
            cell_width,
            cell_height,
            compact,
            standard,
        )
    })
    .await
    .map_err(|error| Error::new(Status::GenericFailure, error.to_string()))?
    .map_err(|error| Error::new(Status::InvalidArg, error))?;
    Ok(RenderedMath {
        png: rendered.png.into(),
        pixel_width: rendered.width,
        pixel_height: rendered.height,
        baseline: rendered.baseline,
        clamped: rendered.clamped,
    })
}

#[cfg(test)]
mod tests {
    use super::render_math_png;
    use super::{hex_rgb, math_source, measure_regions, sentinel_gap_px, Regions, SENTINEL_HEX};

    #[test]
    fn renders_mitex_math_to_a_png() {
        let rendered =
            render_math_png(r"\frac{a}{b}".into(), 16.0 / 12.0, "000000".into(), "ffffff".into(), false, 8.0, 16.0, false, false)
                .expect("formula renders");
        assert!(rendered.png.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert!(rendered.width > 0);
        assert!(rendered.height > 0);
        assert!(
            rendered.baseline > 0.0 && rendered.baseline <= rendered.height as f64,
            "baseline={} height={} width={}",
            rendered.baseline,
            rendered.height,
            rendered.width
        );
    }

    #[test]
    fn a_lone_formula_keeps_the_standard_text_size() {
        // A formula that shares its row with prose is scaled down to fit that
        // row. One that stands alone keeps the standard size, so it is wider and
        // reports that it was not clamped.
        let clamped =
            render_math_png(r"x^2".into(), 16.0 / 12.0, "000000".into(), "ffffff".into(), false, 8.0, 16.0, false, false)
                .expect("formula renders");
        let standard =
            render_math_png(r"x^2".into(), 16.0 / 12.0, "000000".into(), "ffffff".into(), false, 8.0, 16.0, false, true)
                .expect("formula renders");
        assert!(clamped.clamped, "the shared variant is scaled into the text row");
        assert!(!standard.clamped, "the standard variant is never clamped");
        assert!(
            standard.height > clamped.height,
            "standard {} clamped {}",
            standard.height,
            clamped.height
        );
    }

    #[test]
    fn trims_display_math_whitespace_before_layout() {
        // `$$` display blocks hand the renderer the raw inner text including the
        // delimiter-adjacent newlines. Left alone, a multiline expression inside the
        // sentinel template defeats the widest-gap split and the sentinel leaks next
        // to the formula; trimming it must produce a clean single-expression raster.
        let rendered = render_math_png(
            "\n\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}\n".into(),
            16.0 / 12.0,
            "000000".into(),
            "ffffff".into(),
            true,
            8.0,
            16.0,
            false,
            false,
        )
        .expect("formula renders");
        assert!(rendered.width > 0);
    }

    #[test]
    fn widest_gap_split_separates_sentinel_from_formula() {
        let math = mitex::convert_math(r"\frac{a}{b}", None).expect("mitex conversion");
        let source = math_source(&math, "000000", "ffffff", SENTINEL_HEX, false);
        let page = super::compile_page(source).expect("compile");
        let image = super::render_page(&page, 16.0 / 12.0);
        let regions = measure_regions(&image, hex_rgb("ffffff"), sentinel_gap_px(16.0 / 12.0));
        assert!(matches!(regions, Regions { math: Some(_), sentinel: Some(_), .. }), "both ink regions found");
        assert!(regions.math.is_some());
    }

    // Every LaTeX command the converter can emit has to reach Typst as a
    // rendered formula. A command without a handler in the scope fails to
    // compile and silently falls back to the LaTeX source.
    const COVERAGE: &[&str] = &[
        r"\frac{a}{b}",
        r"\dfrac{a}{b}",
        r"\tfrac{a}{b}",
        r"\sqrt[3]{x}",
        r"\sqrt{x}",
        r"\displaystyle\frac{1}{2}",
        r"\text{hello}",
        r"\operatorname{sgn}(x)",
        r"\binom{n}{k}",
        r"\mathbb{R}",
        r"\int_0^1 f",
        r"\iint f",
        r"\oint f",
        r"\left| x \right|",
        r"\begin{pmatrix} a & b \end{pmatrix}",
        r"\begin{bmatrix} a \end{bmatrix}",
        r"\begin{matrix} a \end{matrix}",
        r"\begin{cases} a \end{cases}",
        r"\begin{aligned} a &= b \end{aligned}",
        r"\begin{array}{cc} a & b \end{array}",
        r"\underbrace{a}_{b}",
        r"\overbrace{a}^{b}",
        r"\vec{v}",
        r"\hat{x}",
        r"\overline{a}",
        r"\underline{a}",
        r"\boxed{a}",
        r"\phantom{a}",
        r"\xrightarrow{A}",
        r"\middle|",
        r"\big|",
        r"\lim_{x \to 0}",
        r"\max_{x}",
        r"\substack{a \\ b}",
        r"\begin{equation} a \end{equation}",
        r"\sum_{i=1}^{n} i",
        r"\prod_{i} x",
        r"\lim_{x \to 0} f(x)",
        r"\int_a^b f",
    ];

    #[test]
    fn geometry_stays_stable() {
        // The raster box is part of the contract with the terminal: it decides
        // how many cells the image occupies and where the baseline sits.
        let cases: &[(&str, u32, u32)] = &[
            ("x", 2, 1),
            ("x^2", 2, 1),
            (r"\frac{a}{b}", 1, 2),
            (r"\frac{n(n+1)(2n+1)}{6}", 10, 2),
            (r"\sum_{i=1}^{n} i^2", 7, 2),
            (r"\int_0^\infty e^{-x^2}\,dx", 10, 2),
            (r"\sqrt{\pi}", 3, 1),
            (r"\left( \frac{1}{2} \right]", 3, 2),
            (r"P(A \mid B) = \frac{P(B \mid A) P(A)}{P(B)}", 20, 2),
            (r"v = \sqrt{GM\left(\frac{2}{r} - \frac{1}{a}\right)}", 17, 2),
            ("E = mc^2", 8, 1),
            (r"\lim_{x \to 0} \frac{\sin x}{x} = 1", 14, 2),
            (r"\theta = 28.4°", 8, 1),
            (r"\varepsilon = -\frac{GM}{2a}", 9, 2),
        ];
        for (formula, columns, rows) in cases {
            let rendered = render_math_png(
                (*formula).into(),
                16.0 / 12.0,
                "000000".into(),
                "ffffff".into(),
                false,
                8.0,
                16.0,
                false,
                false,
            )
            .unwrap_or_else(|error| panic!("{formula} renders: {error}"));
            assert_eq!(rendered.width / 8, *columns, "{formula} columns");
            assert_eq!(rendered.height / 16, *rows, "{formula} rows");
            assert!(
                rendered.baseline > 0.0 && rendered.baseline <= rendered.height as f64,
                "{formula} baseline {}",
                rendered.baseline
            );
        }
    }

    #[test]
    fn display_math_uses_the_display_style() {
        // In text style a large operator carries its limits beside it, so the
        // formula is as tall as a single line. In display style the limits move
        // above and below the operator, which makes the ink taller.
        let measure = |display: bool| {
            let math = mitex::convert_math(r"\sum_{i=1}^{n} i^2", None).expect("mitex conversion");
            let source = math_source(&math, "000000", "ffffff", SENTINEL_HEX, display);
            let page = super::compile_page(source).expect("compile");
            let image = super::render_page(&page, 16.0 / 12.0);
            let regions = measure_regions(&image, hex_rgb("ffffff"), sentinel_gap_px(16.0 / 12.0));
            let ink = regions.math.expect("formula ink");
            (ink.bottom - ink.top) as f64
        };

        let inline = measure(false);
        let display = measure(true);
        assert!(display > inline * 1.25, "display ink {display} should be much taller than inline {inline}");
    }

    #[test]
    fn every_converted_command_reaches_typst() {
        let mut failures = Vec::new();
        for formula in COVERAGE {
            let rendered = render_math_png(
                (*formula).into(),
                16.0 / 12.0,
                "000000".into(),
                "ffffff".into(),
                false,
                8.0,
                16.0,
                false,
                false,
            );
            if let Err(error) = rendered {
                // Keep the first diagnostic message: it names the missing helper.
                let message = error
                    .split("message: \"")
                    .nth(1)
                    .and_then(|rest| rest.split('"').next())
                    .unwrap_or(&error);
                failures.push(format!("{formula}: {message}"));
            }
        }
        assert!(failures.is_empty(), "commands that failed to render:\n{}", failures.join("\n"));
    }
}
