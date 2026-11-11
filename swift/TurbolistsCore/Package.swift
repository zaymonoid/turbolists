// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TurbolistsCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [
        .library(name: "TurbolistsCore", targets: ["TurbolistsCore"])
    ],
    targets: [
        .target(name: "TurbolistsCore"),
        .testTarget(name: "TurbolistsCoreTests", dependencies: ["TurbolistsCore"]),
    ]
)
