# MatPilot V2 Scientific Computation Layer

## 1. Core Principle: Absolute Separation from AI
The Scientific Computation Layer is the mathematical heart of MatPilot. It operates with absolute deterministic rigor. 
**Crucial Rule**: The AI is strictly prohibited from performing numerical processing, peak fitting, baseline correction, or any other mathematical manipulation. The AI's role is semantic reasoning; the Computation Layer's role is mathematical resolution.

## 2. Architecture Position
**Data Flow**:
`Raw Upload` -> `Scientific Computation Engine` -> `Scientific Validation Layer` -> `Validated Results` -> `AI Scientist` -> `Report`

## 3. Core Responsibilities
- **Numerical Processing**: Matrix operations, convolutions, interpolations.
- **Signal Processing**: Fourier transforms, Savitzky-Golay smoothing, wavelet transforms.
- **Background Correction**: Polynomial, Shirley, Tougaard, and rubber-band baseline subtraction.
- **Peak Fitting**: Levenberg-Marquardt algorithms for Gaussian, Lorentzian, pseudo-Voigt, and Pearson VII deconvolutions.
- **Optical & Spectral Calculations**: Kubelka-Munk conversions, Tauc extrapolations.
- **Crystallographic Calculations**: Bragg's Law, Scherrer equation, Rietveld refinement (profile fitting).

## 4. Implementation Framework
- **Engine Core**: Developed in Python using highly optimized libraries (NumPy, SciPy, scikit-learn).
- **GPU Acceleration**: Designed to seamlessly bridge to CuPy or PyTorch tensors for computationally intensive tasks like 2D detector integration or multi-phase Rietveld refinement.
- **Stateless Operation**: The Computation Engine operates as a pure function: `f(raw_data, parameters) -> results`. It does not query the database itself; the Application Layer orchestrates the data retrieval.
