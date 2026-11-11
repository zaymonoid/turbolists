// swift-tools-version: 6.0
// Builds the app's store layer (Kitbag/Sources/Store) and its tests
// (Kitbag/Tests) as a macOS package so `swift test` can run them without
// the simulator. Sources are symlinked; the module is named `Kitbag` so
// `@testable import Kitbag` resolves the same as in the Xcode test target.
import PackageDescription

let package = Package(
    name: "AppLogic",
    platforms: [.macOS(.v15)],
    dependencies: [
        .package(path: "../KitbagCore"),
        .package(url: "https://github.com/subconsciousnetwork/ObservableStore", exact: "0.6.1"),
    ],
    targets: [
        .target(name: "Kitbag", dependencies: ["KitbagCore", "ObservableStore"]),
        .testTarget(name: "KitbagTests", dependencies: ["Kitbag"]),
    ]
)
