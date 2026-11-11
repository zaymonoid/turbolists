// Renders the SVG sources in this folder to the opaque 1024 px PNGs in the asset catalog.
// Run from swift/Kitbag: swift Design/render-icons.swift
import AppKit

let iconset = "Sources/Resources/Assets.xcassets/AppIcon.appiconset"
for name in ["AppIcon", "AppIcon-tinted"] {
    guard let image = NSImage(contentsOfFile: "Design/\(name).svg") else { fatalError("Cannot read \(name).svg") }
    let side = 1024
    // No alpha channel: App Store icons must be opaque.
    let context = CGContext(
        data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    )!
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    image.draw(in: NSRect(x: 0, y: 0, width: side, height: side))
    let png = NSBitmapImageRep(cgImage: context.makeImage()!).representation(using: .png, properties: [:])!
    try png.write(to: URL(fileURLWithPath: "\(iconset)/\(name).png"))
    print("wrote \(iconset)/\(name).png")
}
