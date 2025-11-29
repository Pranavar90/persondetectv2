import torch
import os
os.environ['YOLO_VERBOSE'] = 'False'

print("\n" + "="*60)
print("GPU VERIFICATION TEST")
print("="*60)

# Check PyTorch CUDA
print(f"\n1. PyTorch CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"   GPU Count: {torch.cuda.device_count()}")
    print(f"   Current Device: {torch.cuda.current_device()}")
    print(f"   Device Name: {torch.cuda.get_device_name(0)}")
    print(f"   CUDA Version: {torch.version.cuda}")
    print(f"   GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
else:
    print("   WARNING: CUDA is NOT available!")
    print("   PyTorch is using CPU only")

# Test YOLO model
print("\n2. Testing YOLO Model:")
try:
    from ultralytics import YOLO
    model = YOLO('yolo11x.pt', verbose=False)
    print(f"   Model loaded: OK")
    
    # Check model device
    device_before = next(model.model.parameters()).device
    print(f"   Model device before .to(): {device_before}")
    
    # Move to GPU
    if torch.cuda.is_available():
        model.to(0)
        device_after = next(model.model.parameters()).device
        print(f"   Model device after .to(0): {device_after}")
        if 'cuda' in str(device_after):
            print(f"   SUCCESS: Model is on GPU!")
        else:
            print(f"   ERROR: Model is still on CPU!")
    else:
        print(f"   ERROR: GPU not available, model on CPU")
        
except Exception as e:
    print(f"   Error: {e}")
    import traceback
    traceback.print_exc()

# Check GPU memory usage
if torch.cuda.is_available():
    print("\n3. GPU Memory Status:")
    print(f"   Allocated: {torch.cuda.memory_allocated(0) / 1024**2:.2f} MB")
    print(f"   Cached: {torch.cuda.memory_reserved(0) / 1024**2:.2f} MB")

print("\n" + "="*60)
print("Verification Complete")
print("="*60 + "\n")
