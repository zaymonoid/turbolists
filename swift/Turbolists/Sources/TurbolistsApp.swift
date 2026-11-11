import ObservableStore
import SwiftUI

@main
struct TurbolistsApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var store = Store(state: AppModel(), environment: AppEnvironment())

    init() {
        Theme.configureNavigationBar()
    }

    var body: some Scene {
        WindowGroup {
            AppShell()
                .environmentObject(store)
                .tint(Theme.accent)
                .task { store.send(.start) }
        }
        .onChange(of: scenePhase) { _, phase in
            // iOS may suspend before the debounce fires; write immediately.
            if phase == .background { store.send(.flushSave) }
        }
    }
}
