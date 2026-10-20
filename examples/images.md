# Local Images

Opaque PNG:

![Opaque generated gradient](./assets/opaque.png)

Transparent PNG composited against the theme background:

![Transparent overlapping circles](./assets/transparent.png)

Color spectrum:

![Color spectrum gradient](./assets/spectrum.png)

Checker pattern:

![Hard-edged checker pattern](./assets/checker.png)

Animated GIF:

![Animated GIF](./assets/pulse.gif)

These failure cases must not load network assets or escape the example root:

![Blocked remote image](https://example.com/image.png)

![Blocked parent path](../outside.png)

![Missing image](./assets/missing.png)
