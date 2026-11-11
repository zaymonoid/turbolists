// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "KitbagCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [
        .library(name: "KitbagCore", targets: ["KitbagCore"])
    ],
    targets: [
        .target(name: "KitbagCore"),
        .testTarget(name: "KitbagCoreTests", dependencies: ["KitbagCore"]),
    ]
)
