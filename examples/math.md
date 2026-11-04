# Orbital mechanics

The flight director does not need every number in the recorder to agree before
asking whether the trajectory is plausible. These are the compact checks used
to turn altitude, velocity and timing into an insertion estimate for KST-118.

The launch azimuth is $\theta = 28.4°$, and the specific orbital energy of the
transfer stage is $\varepsilon = -\frac{GM}{2a}$. The signs matter: a negative
specific energy describes a bound transfer rather than an escape trajectory.

Inline math within prose works as well: $v^2 = v_0^2 + 2a\,\Delta x$. In the
watch book this is the quick sanity check for a reported acceleration segment.

A currency amount inside a procurement note stays text: the launch cost is
\$5 per kilogram. Math inside code stays source: `$x^2$`.

## Transfer velocity

The vis-viva equation estimates the speed at a point on an elliptical transfer
orbit:

$$
v = \sqrt{GM\left(\frac{2}{r} - \frac{1}{a}\right)}
$$

The measured velocity does not have to land on the estimate exactly. The useful
question is whether the difference is explained by the burn timing and the
known uncertainty in `vel`, rather than whether a rounded terminal value looks
identical.

## Period and energy

Display formulas are typeset in display style, so a summation carries its
limits above and below the operator:

$$
\sum_{k=0}^{n} \frac{1}{2^k} = 2 - \frac{1}{2^n}
$$

The orbital period of the payload orbit follows from the same model:

$$
T = 2\pi\sqrt{\frac{a^3}{GM}}
$$

The bracket form may span lines that also have Markdown meaning on their own:

\[
X
=
Y
\]

Together, these expressions give the review team two independent ways to spot
a bad radius or a clock offset. If the period is implausible while the energy
looks reasonable, the first suspect is usually the timestamp alignment.

## Scope and source fallback

The renderer's math compatibility layer covers constructs that have no direct
Typst equivalent: a cube root, a display fraction, upright text and an
operator name:

$$
\sqrt[3]{\frac{a}{b}} = \dfrac{\sqrt[3]{a}}{\sqrt[3]{b}}
$$

The orbital elements, written out and named:

$$
\text{semi-major axis} = a, \qquad \operatorname{eccentricity} = e
$$

On a terminal without graphics support this page intentionally shows the
original LaTeX source. The source remains useful in the incident archive:

```tex
\[ \frac{a}{b} \]
```

A formula the typesetter cannot parse also stays source instead of turning into
a broken glyph:

$$
\frac{1}{
$$

That last block is malformed on purpose. A failed typesetting pass should be a
visible review item, not a silent hole between two otherwise correct readings.
