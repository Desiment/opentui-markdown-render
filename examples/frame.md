# The viewer window

The operator's report lives inside a frame that behaves like a physical console
window. It has a fixed outer width and a position inside the area the host gives
it; the prose stays on the left, so centering the window never makes the text
jump from one reading to the next.

| Sketch | Alignment | Best use |
| --- | --- | --- |
| `[ text ]----------` | left | incident notes beside a live console |
| `-----[ text ]-----` | center | a standalone mission brief |
| `----------[ text ]` | right | a side-by-side comparison |

The width is the outer width of the window. The border takes one column on each
side and the padding takes one more, so a frame configured for 88 columns gives
the document 84.

## What the frame changes

- The width is clamped to the measured area, so the same config works on a
  narrow terminal in the launch room.
- A title is carved into the top border and is cut when it does not fit.
- The frame can scroll with the document (as in this demo) or stay fixed while
  the document scrolls, when the host draws it outside its scroll box.

> A window is a promise about where the text ends. Every block — prose, a table,
> a formula — has to keep that promise, or the operator loses the right edge of
> the report exactly when the data gets interesting.

## A wide downlink table

The table below is wider than the window on purpose. It represents the radio
plan for the ground stations, so hiding columns or wrapping every cell would
make the comparison harder. It pans sideways with a horizontal wheel or a drag
instead of stretching the frame.

| Channel | Frequency | Modulation | Encoding | Error correction | Recorder | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| telemetry-1 | 437.125 MHz | GFSK | Manchester | Reed–Solomon | ground station A | primary downlink |
| telemetry-2 | 437.225 MHz | GFSK | Manchester | Reed–Solomon | ground station B | hot standby |
| beacon | 145.825 MHz | AFSK | AX.25 | checksum | portable | safing channel |
| science | 2.240 GHz | QPSK | LDPC | convolutional | ground station A | high-rate payload |
| command | 401.500 MHz | BPSK | NRZ-L | Hamming | ground station B | uplink only |

The frame follows the configured alignment even when the table is much wider
than the text. The table is allowed to be wider than the window; the window
decides where the visible part ends.

## Lists keep the left edge

1. The first item starts at the left edge of the window.
2. The second item does not move when the frame is centered.
3. The third item keeps the same hanging indent as the others.

That predictable edge is why the frame is useful for operations notes: a reader
can compare two reports without learning a new visual layout for each viewport.
