import numpy as np
from typing import Tuple, List, Optional
from scipy.signal import savgol_filter, find_peaks

def apply_savitzky_golay(y_data: List[float], window_length: int = 11, polyorder: int = 2) -> List[float]:
    """
    Applies Savitzky-Golay smoothing to a 1D array.
    """
    if len(y_data) < window_length:
        return y_data # Not enough data to smooth
    
    # Ensure window_length is odd
    if window_length % 2 == 0:
        window_length += 1
        
    y_array = np.array(y_data)
    smoothed = savgol_filter(y_array, window_length, polyorder)
    return smoothed.tolist()

def detect_local_maxima(x_data: List[float], y_data: List[float], prominence: float = 0.1) -> Tuple[List[float], List[float]]:
    """
    Detects peaks using scipy.signal.find_peaks.
    Returns (x_peaks, y_peaks).
    """
    y_array = np.array(y_data)
    # Convert absolute prominence to relative if needed, or use directly
    peaks, _ = find_peaks(y_array, prominence=prominence)
    
    x_peaks = [x_data[i] for i in peaks]
    y_peaks = [y_data[i] for i in peaks]
    return x_peaks, y_peaks

def fit_polynomial_baseline(x_data: List[float], y_data: List[float], order: int = 2) -> List[float]:
    """
    Fits a simple polynomial baseline. In a real scenario, this would be an iterative asymmetric least squares.
    """
    x_array = np.array(x_data)
    y_array = np.array(y_data)
    
    # Very basic polynomial fit for demonstration
    coeffs = np.polyfit(x_array, y_array, order)
    poly = np.poly1d(coeffs)
    baseline = poly(x_array)
    return baseline.tolist()

def normalize_min_max(y_data: List[float]) -> List[float]:
    """
    Normalizes data to 0-1 range.
    """
    y_array = np.array(y_data)
    y_min = np.min(y_array)
    y_max = np.max(y_array)
    
    if y_max == y_min:
        return y_data
        
    normalized = (y_array - y_min) / (y_max - y_min)
    return normalized.tolist()
