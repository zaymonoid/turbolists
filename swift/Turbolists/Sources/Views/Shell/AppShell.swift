import ObservableStore
import SwiftUI

/// Root view: loading / load-error states, then the three tabs with the
/// save-error and Undo banners.
struct AppShell: View {
    @EnvironmentObject var store: Store<AppModel>

    var body: some View {
        switch store.state.loadStatus {
        case .loading:
            ProgressView("Getting your lists ready…")
                .foregroundStyle(Theme.inkDim)
                .accessibilityAddTraits(.updatesFrequently)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.background.ignoresSafeArea())
        case .error:
            EmptyState(
                symbol: "exclamationmark.triangle",
                tint: Theme.danger,
                title: "Turbolists",
                message: "We couldn’t open your saved lists. Try loading them again."
            ) {
                Button("Try again") { store.send(.start) }
                    .buttonStyle(.pill)
            }
            .background(Theme.background.ignoresSafeArea())
        case .ready:
            tabs
        }
    }

    private var tabs: some View {
        TabView(selection: store.binding(get: \.view, tag: AppAction.setView)) {
            Tab("Trips", systemImage: "suitcase", value: AppView.trips) {
                TripsView().modifier(ShellBanners())
            }
            Tab("Kits", systemImage: "square.stack.3d.up", value: AppView.kits) {
                KitsView().modifier(ShellBanners())
            }
            Tab("Items", systemImage: "tag", value: AppView.items) {
                ItemsView().modifier(ShellBanners())
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
    }
}

/// Applied inside each tab so the Undo banner sits just above the tab bar
/// and the save-error banner stays at the top, on every screen of the tab.
private struct ShellBanners: ViewModifier {
    @EnvironmentObject var store: Store<AppModel>
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var motion: Animation? { reduceMotion ? nil : .snappy }

    func body(content: Content) -> some View {
        content
            .safeAreaInset(edge: .top, spacing: 0) {
                if store.state.persistence == .error {
                    SaveErrorBanner { store.send(.retrySave) }
                        .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if let undo = store.state.undo {
                    UndoBanner(
                        message: undo.message,
                        onUndo: { store.send(.undo) },
                        onDismiss: { store.send(.dismissUndo) }
                    )
                    .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(motion, value: store.state.undo?.message)
            .animation(motion, value: store.state.undo == nil)
            .animation(motion, value: store.state.persistence)
    }
}

private struct SaveErrorBanner: View {
    var onRetry: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.icloud.fill")
                .accessibilityHidden(true)
            Text("Your changes couldn’t be saved.")
                .font(.subheadline.weight(.medium))
                .frame(maxWidth: .infinity, alignment: .leading)
            Button("Retry", action: onRetry)
                .buttonStyle(.bordered)
                .controlSize(.small)
                .tint(.white)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.red.gradient)
        .accessibilityElement(children: .contain)
    }
}

private struct UndoBanner: View {
    var message: String
    var onUndo: () -> Void
    var onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "arrow.uturn.backward.circle.fill")
                .font(.title3)
                .foregroundStyle(Theme.inkDim)
                .accessibilityHidden(true)
            Text(message)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 6)
                .contentTransition(.opacity)
            Button("Undo", action: onUndo)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 8)
                .frame(minHeight: 44)
            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.inkDim)
                    .frame(width: 44, height: 44)
                    .contentShape(.rect)
            }
            .accessibilityLabel("Dismiss undo")
        }
        .padding(.leading, 18)
        .padding(.trailing, 4)
        .glassEffect(.regular.interactive(), in: .capsule)
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }
}
