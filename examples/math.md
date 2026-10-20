# Typeset Math

Inline dollar math: $P(A \mid B) = \frac{P(B \mid A) P(A)}{P(B)}$.

Parenthesized inline math: \(a^2 + b^2 = c^2\).

Escaped dollars stay text: a ticket costs \$5.

Math inside code stays source: `$x^2$`.

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

On terminals without Kitty-compatible graphics, this example intentionally
shows its original LaTeX source.

```tex
\[ \frac{a}{b} \]
```

Broken math also remains source instead of becoming Unicode approximation:

$$
\frac{1}{
$$
