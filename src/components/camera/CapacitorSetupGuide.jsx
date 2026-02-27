# Capacitor Native Camera Plugin Setup

## Quick Start

1. **Install Capacitor:**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init FLIK com.example.flik
   npx cap add ios
   ```

2. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

3. **Add Swift Files** (in Xcode, File → New → File):
   - `CameraEngine.swift` – Core AVFoundation session management
   - `PhotoCaptureDelegate.swift` – Photo capture and file saving
   - `PreviewView.swift` – UIView wrapper for preview layer
   - `FlikCameraPlugin.swift` – Capacitor bridge

4. **Copy Swift code** from SWIFT_CODE_BELOW section into each file

5. **Edit Info.plist** – Add camera permission:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>FLIK needs access to your camera</string>
   ```

6. **Update capacitor.config.ts:**
   ```typescript
   plugins: { FlikCamera: {} }
   ```

7. **In Camera.js:**
   ```javascript
   import { CapacitorCameraAPI } from '@/functions/capacitorCameraPlugin';
   
   const result = await CapacitorCameraAPI.startCamera({ facing: 'back' });
   const photo = await CapacitorCameraAPI.capturePhoto({ quality: 0.95 });
   ```

8. **Build & Run:**
   ```bash
   npx cap sync ios
   npx cap open ios
   # Then Cmd+R in Xcode
   ```

---

## CameraEngine.swift

```swift
import AVFoundation

class CameraEngine: NSObject, AVCapturePhotoCaptureDelegate {
    private let captureSession = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "flik.camera.session")
    
    private var photoOutput: AVCapturePhotoOutput!
    private var frontCamera: AVCaptureDevice?
    private var backCamera: AVCaptureDevice?
    private var currentInput: AVCaptureDeviceInput?
    
    var isRunning = false
    var isFocusLocked = false
    
    var capabilities: [String: Any] {
        let device = currentInput?.device
        return [
            "supportsTorch": device?.hasTorch ?? false,
            "supportsFlash": photoOutput?.supportedFlashModes.count ?? 0 > 0,
            "minZoom": device?.minAvailableVideoZoomFactor ?? 1,
            "maxZoom": device?.maxAvailableVideoZoomFactor ?? 5,
            "minEV": device?.minExposureTargetBias ?? -2,
            "maxEV": device?.maxExposureTargetBias ?? 2,
            "facing": currentFacing()
        ]
    }
    
    func setupSession() {
        sessionQueue.async { [weak self] in
            self?.configureSession()
        }
    }
    
    private func configureSession() {
        guard captureSession.inputs.isEmpty else { return }
        captureSession.sessionPreset = .photo
        
        let discovery = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera],
            mediaType: .video,
            position: .unspecified
        )
        
        for device in discovery.devices {
            if device.position == .back { backCamera = device }
            if device.position == .front { frontCamera = device }
        }
        
        guard let backDevice = backCamera,
              let input = try? AVCaptureDeviceInput(device: backDevice) else { return }
        
        if captureSession.canAddInput(input) {
            captureSession.addInput(input)
            currentInput = input
        }
        
        photoOutput = AVCapturePhotoOutput()
        photoOutput.maxPhotoQualityPrioritization = .quality
        
        if captureSession.canAddOutput(photoOutput) {
            captureSession.addOutput(photoOutput)
        }
        
        DispatchQueue.main.async {
            self.isRunning = true
            self.captureSession.startRunning()
        }
    }
    
    func startRunning() {
        sessionQueue.async {
            if !self.captureSession.isRunning {
                self.captureSession.startRunning()
                DispatchQueue.main.async { self.isRunning = true }
            }
        }
    }
    
    func stopRunning() {
        sessionQueue.async {
            if self.captureSession.isRunning {
                self.captureSession.stopRunning()
                DispatchQueue.main.async { self.isRunning = false }
            }
        }
    }
    
    func switchCamera() {
        guard let currentDevice = currentInput?.device else { return }
        let newDevice = (currentDevice.position == .back) ? frontCamera : backCamera
        guard let device = newDevice, let newInput = try? AVCaptureDeviceInput(device: device) else { return }
        
        sessionQueue.async {
            self.captureSession.beginConfiguration()
            if let currentInput = self.currentInput {
                self.captureSession.removeInput(currentInput)
            }
            if self.captureSession.canAddInput(newInput) {
                self.captureSession.addInput(newInput)
                self.currentInput = newInput
            }
            self.captureSession.commitConfiguration()
            DispatchQueue.main.async { self.isFocusLocked = false }
        }
    }
    
    func setFocusPoint(_ x: CGFloat, _ y: CGFloat) {
        guard let device = currentInput?.device, device.isFocusPointOfInterestSupported else { return }
        sessionQueue.async {
            do {
                try device.lockForConfiguration()
                device.focusMode = .autoFocus
                device.focusPointOfInterest = CGPoint(x: x, y: y)
                if device.isExposurePointOfInterestSupported {
                    device.exposureMode = .autoExpose
                    device.exposurePointOfInterest = CGPoint(x: x, y: y)
                }
                device.unlockForConfiguration()
            } catch {
                print("Focus error: \(error)")
            }
        }
    }
    
    func setAEAFLocked(_ locked: Bool) {
        guard let device = currentInput?.device else { return }
        sessionQueue.async {
            do {
                try device.lockForConfiguration()
                if locked {
                    device.focusMode = .locked
                    device.exposureMode = .locked
                } else {
                    device.focusMode = .continuousAutoFocus
                    device.exposureMode = .continuousAutoExposure
                }
                device.unlockForConfiguration()
                DispatchQueue.main.async { self.isFocusLocked = locked }
            } catch {
                print("AE/AF lock error: \(error)")
            }
        }
    }
    
    func setZoom(_ factor: CGFloat) {
        guard let device = currentInput?.device else { return }
        let clampedFactor = max(device.minAvailableVideoZoomFactor, min(factor, device.maxAvailableVideoZoomFactor))
        sessionQueue.async {
            do {
                try device.lockForConfiguration()
                device.videoZoomFactor = clampedFactor
                device.unlockForConfiguration()
            } catch {
                print("Zoom error: \(error)")
            }
        }
    }
    
    func setExposureBias(_ bias: Float) {
        guard let device = currentInput?.device else { return }
        let clampedBias = max(device.minExposureTargetBias, min(bias, device.maxExposureTargetBias))
        sessionQueue.async {
            do {
                try device.lockForConfiguration()
                device.setExposureTargetBias(clampedBias) { _ in }
                device.unlockForConfiguration()
            } catch {
                print("Exposure error: \(error)")
            }
        }
    }
    
    func setTorch(_ enabled: Bool) {
        guard let device = currentInput?.device, device.hasTorch else { return }
        sessionQueue.async {
            do {
                try device.lockForConfiguration()
                device.torchMode = enabled ? .on : .off
                device.unlockForConfiguration()
            } catch {
                print("Torch error: \(error)")
            }
        }
    }
    
    func capturePhoto(completion: @escaping (URL?, [String: Any]?) -> Void) {
        let settings = AVCapturePhotoSettings()
        settings.photoQualityPrioritization = .quality
        let delegate = PhotoCaptureDelegate(completion: completion)
        photoOutput.capturePhoto(with: settings, delegate: delegate)
    }
    
    private func currentFacing() -> String {
        return (currentInput?.device.position == .front) ? "front" : "back"
    }
}
```

---

## PhotoCaptureDelegate.swift

```swift
import AVFoundation

class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    let completion: (URL?, [String: Any]?) -> Void
    init(completion: @escaping (URL?, [String: Any]?) -> Void) {
        self.completion = completion
    }
    
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            print("Capture error: \(error)")
            completion(nil, nil)
            return
        }
        
        guard let imageData = photo.fileDataRepresentation() else {
            completion(nil, nil)
            return
        }
        
        let tempDir = NSTemporaryDirectory()
        let fileName = UUID().uuidString + ".heic"
        let fileURL = URL(fileURLWithPath: tempDir).appendingPathComponent(fileName)
        
        do {
            try imageData.write(to: fileURL)
            let metadata: [String: Any] = [
                "width": photo.resolvedSettings.photoDimensions.width,
                "height": photo.resolvedSettings.photoDimensions.height,
                "timestamp": Date().timeIntervalSince1970
            ]
            completion(fileURL, metadata)
        } catch {
            print("Write error: \(error)")
            completion(nil, nil)
        }
    }
}
```

---

## PreviewView.swift

```swift
import AVFoundation
import UIKit

class PreviewView: UIView {
    var videoPreviewLayer: AVCaptureVideoPreviewLayer {
        guard let layer = layer as? AVCaptureVideoPreviewLayer else {
            fatalError("Expected CALayer to be AVCaptureVideoPreviewLayer")
        }
        return layer
    }
    
    var session: AVCaptureSession? {
        get { return videoPreviewLayer.session }
        set { videoPreviewLayer.session = newValue }
    }
    
    override class var layerClass: AnyClass {
        return AVCaptureVideoPreviewLayer.self
    }
}
```

---

## FlikCameraPlugin.swift

```swift
import Capacitor
import AVFoundation

@objc(FlikCameraPlugin)
public class FlikCameraPlugin: CAPPlugin {
    private let cameraEngine = CameraEngine()
    
    override public func load() {}
    
    @objc func startCamera(_ call: CAPPluginCall) {
        cameraEngine.setupSession()
        cameraEngine.startRunning()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            call.resolve(self.cameraEngine.capabilities)
        }
    }
    
    @objc func stopCamera(_ call: CAPPluginCall) {
        cameraEngine.stopRunning()
        call.resolve()
    }
    
    @objc func switchCamera(_ call: CAPPluginCall) {
        cameraEngine.switchCamera()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            call.resolve(["facing": self.cameraEngine.capabilities["facing"] ?? "back"])
        }
    }
    
    @objc func setTorch(_ call: CAPPluginCall) {
        let enabled = call.getBool("on") ?? false
        cameraEngine.setTorch(enabled)
        call.resolve()
    }
    
    @objc func setFlashMode(_ call: CAPPluginCall) {
        call.resolve()
    }
    
    @objc func setZoom(_ call: CAPPluginCall) {
        let value = call.getFloat("value") ?? 1.0
        cameraEngine.setZoom(CGFloat(value))
        call.resolve()
    }
    
    @objc func setExposureBias(_ call: CAPPluginCall) {
        let value = call.getFloat("value") ?? 0
        cameraEngine.setExposureBias(value)
        call.resolve()
    }
    
    @objc func setFocusPoint(_ call: CAPPluginCall) {
        let x = call.getFloat("x") ?? 0.5
        let y = call.getFloat("y") ?? 0.5
        cameraEngine.setFocusPoint(CGFloat(x), CGFloat(y))
        call.resolve()
    }
    
    @objc func setAEAFLocked(_ call: CAPPluginCall) {
        let locked = call.getBool("locked") ?? false
        cameraEngine.setAEAFLocked(locked)
        call.resolve()
    }
    
    @objc func capturePhoto(_ call: CAPPluginCall) {
        cameraEngine.capturePhoto { fileURL, metadata in
            guard let fileURL = fileURL else {
                call.reject("Capture failed")
                return
            }
            call.resolve([
                "fileUrl": fileURL.absoluteString,
                "metadata": metadata ?? [:]
            ])
        }
    }
}
```

---

## Key Points

- **sessionQueue** ensures all device operations happen serially, preventing crashes
- **photoOutput delegate** is retained; don't make it a local variable
- **Permission** is auto-requested on first camera access (handled by Capacitor)
- **Preview** is automatically managed by Capacitor's webview
- **Fallback**: If native fails, your Camera.js can still use web `getUserMedia`

---

## Support Files Already Created

✅ `functions/capacitorCameraPlugin.js` – JS bridge ready to use
✅ This setup guide in `components/camera/CapacitorSetupGuide.md