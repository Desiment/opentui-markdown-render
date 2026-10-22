# Orbital mechanics

The formulas a flight plan is built on. Inline math uses dollar signs: the
launch azimuth is $\theta = 28.4°$, and the specific orbital energy of the
transfer stage is $\varepsilon = -\frac{GM}{2a}$.

Parenthesised inline math works as well: $v^2 = v_0^2 + 2a\,\Delta x$.

A currency amount inside a log line stays text: the launch cost is \$5 per
kilogram.

Math inside code stays source: `$x^2$`.

The vis-viva equation, in full:

$$
v = \sqrt{GM\left(\frac{2}{r} - \frac{1}{a}\right)}
$$

Display formulas are typeset in the display style, so a summation carries its
limits above and below the operator:

$$
\sum_{k=0}^{n} \frac{1}{2^k} = 2 - \frac{1}{2^n}
$$

The orbital period of the payload orbit follows from the same model:

$$
T = 2\pi\sqrt{\frac{a^3}{GM}}
$$

The commands MiTeX converts but Typst has no direct equivalent for are handled
by the MiTeX scope: a cube root, a display fraction, upright text and an
operator name:

$$
\sqrt[3]{\frac{a}{b}} = \dfrac{1}{\sqrt[3]{b}}
$$

The orbital elements, written out and named:

$$
\text{semi-major axis} = a, \qquad \operatorname{eccentricity} = e
$$

On a terminal without graphics support this page intentionally shows the
original LaTeX source:

```tex
\[ \frac{a}{b} \]
```

A formula the typesetter cannot parse also stays source instead of turning
into a broken glyph:

$$
\frac{1}{
$$
