// swift-tools-version: 6.0
// Builds the app's store layer (Turbolists/Sources/Store) and its tests
// (Turbolists/Tests) as a macOS package so `swift test` can run them without
// the simulator. Sources are symlinked; the module is named `Turbolists` so
// `@testable import Turbolists` resolves the same as in the Xcode test target.
import PackageDescription

let package = Package(
    name: "AppLogic",
    platforms: [.macOS(.v15)],
    dependencies: [
        .package(path: "../TurbolistsCore"),
        .package(url: "https://github.com/subconsciousnetwork/ObservableStore", exact: "0.6.1"),
    ],
    targets: [
        .target(name: "Turbolists", dependencies: ["TurbolistsCore", "ObservableStore"]),
        .testTarget(name: "TurbolistsTests", dependencies: ["Turbolists"]),
    ]
)
