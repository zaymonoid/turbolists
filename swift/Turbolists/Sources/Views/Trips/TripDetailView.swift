import ObservableStore
import SwiftUI
import TurbolistsCore

/// One trip's checklist. Recreated per trip (`.id(trip.id)`), so filters, search and
/// counters never carry over from another trip.
struct TripDetailView: View {
    let trip: Trip
    @Binding var sheet: TripSheet?
    /// Archive/restore via the list's handler so its segment and search reset (TS `archive()`).
    let toggleArchived: (Trip) -> Void

    @EnvironmentObject private var store: Store<AppModel>
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var query = ""
    @State private var remainingOnly = false
    @State private var confirmingReset = false
    @State private var deleteAfterDismiss = false
    /// Checked set the row order is frozen to, briefly, so a check reads before its row moves.
    @State private var packingOrder: Set<ItemId>?
    @State private var reorderTask: Task<Void, Never>?
    @State private var hapticTick = 0
    @State private var celebrate = 0
    @State private var lastToggled: ItemId?

    private var kits: [Kit] { store.state.data.kits }

    var body: some View {
        let progress = packProgress(trip, kits: kits)
        let complete = progress.total > 0 && progress.checked == progress.total
        // A scroll view of our own cards rather than a List: the checklist animates
        // its own reordering, and List fought it (section edges dipping during moves,
        // and taps on tall rows scrolling instead of toggling).
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                if trip.archived == true {
                    HStack {
                        Label("Archived trip", systemImage: "archivebox")
                            .foregroundStyle(Theme.inkDim)
                        Spacer()
                        Button("Restore trip") { toggleArchived(trip) }
                            .fontWeight(.semibold)
                    }
                    .card(padding: 16)
                }
                kitSummary.padding(.horizontal, 4)
                if progress.total > 0 {
                    ProgressHero(progress: progress, celebrate: celebrate)
                    checklist(progress)
                    Button(role: .destructive) { confirmingReset = true } label: {
                        Label("Reset packing progress", systemImage: "arrow.counterclockwise")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                    }
                    .foregroundStyle(progress.checked == 0 ? Theme.inkFaint : Theme.danger)
                    .background(Theme.panel, in: .rect(cornerRadius: Theme.cardRadius))
                    .buttonStyle(CardButtonStyle())
                    .disabled(progress.checked == 0)
                    .padding(.top, 6)
                } else {
                    noItems
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.immediately)
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(trip.name)
        .navigationBarTitleDisplayMode(.large)
        .modifier(ChecklistSearch(enabled: progress.total > 0, query: $query))
        .toolbar { toolbar(progress) }
        .sensoryFeedback(.impact(weight: .light), trigger: hapticTick)
        .sensoryFeedback(.success, trigger: celebrate)
        .onChange(of: complete) { was, now in
            // Celebrate the moment the last item goes in, not on arrival.
            if now && !was { celebrate += 1 }
        }
        .confirmationDialog("Start packing again?", isPresented: $confirmingReset, titleVisibility: .visible) {
            Button("Reset", role: .destructive) {
                clearReorder()
                store.send(.resetChecks(tripId: trip.id))
            }
        } message: {
            Text("All items on this trip will be marked as unpacked.")
        }
        .sheet(item: $sheet, onDismiss: {
            if deleteAfterDismiss { store.send(.deleteTrip(id: trip.id)) }
        }) { kind in
            TripSettingsSheet(tripId: trip.id, mode: kind, toggleArchived: toggleArchived) { deleteAfterDismiss = true }
        }
        .onDisappear { clearReorder() }
    }

    // MARK: Header

    @ViewBuilder private var kitSummary: some View {
        let names = trip.kitIds.compactMap { id in kits.first { $0.id == id }?.name }
        Button { sheet = .settings } label: {
            HStack(spacing: 8) {
                Image(systemName: names.isEmpty ? "plus.circle.fill" : "square.stack.3d.up.fill")
                    .foregroundStyle(Theme.accent)
                Text(names.isEmpty ? "Choose kits" : names.joined(separator: " · "))
                    .foregroundStyle(names.isEmpty ? Theme.accent : Theme.inkDim)
                    .fontWeight(names.isEmpty ? .semibold : .medium)
                    .lineLimit(1)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Theme.inkFaint)
                Spacer(minLength: 0)
            }
            .font(.subheadline)
            .frame(minHeight: 36)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(names.isEmpty ? "Choose kits" : "Kits: \(names.joined(separator: ", ")). Edit kits")
    }

    @ToolbarContentBuilder private func toolbar(_ progress: PackProgress) -> some ToolbarContent {
        ToolbarItemGroup(placement: .primaryAction) {
            if progress.total > 0 {
                ShareLink(
                    item: formatTripChecklist(trip, kits: kits, items: store.state.data.items),
                    subject: Text(trip.name),
                    preview: SharePreview(trip.name)
                ) {
                    Label("Share checklist", systemImage: "square.and.arrow.up")
                }
                Button(
                    remainingOnly ? "Show all" : "Unpacked only",
                    systemImage: remainingOnly
                        ? "line.3.horizontal.decrease.circle.fill"
                        : "line.3.horizontal.decrease.circle"
                ) {
                    withAnimation(reduceMotion ? nil : .default) { remainingOnly.toggle() }
                }
            }
            Button("Trip settings", systemImage: "slider.horizontal.3") { sheet = .settings }
        }
    }

    // MARK: Checklist

    @ViewBuilder private func checklist(_ progress: PackProgress) -> some View {
        let items = Dictionary(store.state.data.items.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let orderChecked = packingOrder ?? trip.checked
        let q = query.tripTrimmed.lowercased()
        let matches = { (id: ItemId) in q.isEmpty || (items[id]?.name ?? "").lowercased().contains(q) }
        let shown = { (id: ItemId) in matches(id) && (!remainingOnly || !orderChecked.contains(id)) }
        let groups = checklistGroups(trip, kits: kits)
        let visibleCount = groups.reduce(0) { $0 + $1.ids.filter(shown).count }

        if visibleCount == 0 && !q.isEmpty {
            EmptyState(
                symbol: "magnifyingglass",
                title: "No matching items",
                message: remainingOnly ? "Try another name or show packed items too." : "Try another item name."
            ) {
                Button("Clear search") { query = "" }.fontWeight(.semibold)
            }
        } else if progress.checked == progress.total && remainingOnly && q.isEmpty && packingOrder == nil {
            EmptyState(
                symbol: "checkmark.seal.fill",
                tint: Theme.moss,
                title: "You’re all set",
                message: "Everything on your list is packed."
            )
            .transition(.opacity)
        } else {
            ForEach(groups) { group in
                // Unpacked first, packed last, kit order preserved within each state.
                let candidates = group.ids.filter(shown)
                let visible = candidates.filter { !orderChecked.contains($0) } + candidates.filter { orderChecked.contains($0) }
                let packed = group.ids.filter { trip.checked.contains($0) }.count
                if !visible.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        GroupHeader(
                            title: group.name,
                            count: "\(packed)/\(group.ids.count)",
                            countTint: packed == group.ids.count ? Theme.moss : Theme.inkDim
                        )
                        .padding(.horizontal, 4)
                        .animation(reduceMotion ? nil : .snappy, value: packed)
                        VStack(spacing: 0) {
                            ForEach(Array(visible.enumerated()), id: \.element) { index, id in
                                checkRow(id, name: items[id]?.name ?? "Missing item",
                                         tint: packed == group.ids.count ? Theme.moss : Theme.accent)
                                    .overlay(alignment: .top) {
                                        if index > 0 {
                                            Theme.line.frame(height: 1).padding(.leading, 56)
                                        }
                                    }
                                    // The row that just moved glides over its neighbours.
                                    .zIndex(id == lastToggled ? 1 : 0)
                                    .transition(.opacity)
                            }
                        }
                        .background(Theme.panel, in: .rect(cornerRadius: Theme.cardRadius))
                        .clipShape(.rect(cornerRadius: Theme.cardRadius))
                    }
                    .padding(.top, 8)
                }
            }
        }
    }

    private func checkRow(_ id: ItemId, name: String, tint: Color) -> some View {
        let packed = trip.checked.contains(id)
        return Button { toggle(id) } label: {
            HStack(spacing: 14) {
                CheckBox(checked: packed, tint: tint)
                Text(name)
                    .foregroundStyle(packed ? Theme.inkFaint : Theme.ink)
                    .animatedStrike(packed)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
            }
            .padding(.vertical, 13)
            .padding(.horizontal, 16)
            .frame(minHeight: 54)
            .contentShape(.rect)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.28), value: packed)
        }
        .buttonStyle(RowPressStyle())
        .accessibilityLabel(name)
        .accessibilityValue(packed ? "Packed" : "Not packed")
        .accessibilityAddTraits(packed ? [.isToggle, .isSelected] : .isToggle)
    }

    @ViewBuilder private var noItems: some View {
        let hasKits = !trip.kitIds.isEmpty
        EmptyState(
            symbol: hasKits ? "shippingbox" : "checklist",
            badge: hasKits ? nil : "plus.circle.fill",
            title: hasKits ? "These kits are empty" : "What’s coming with you?",
            message: hasKits ? "Add items to your kits to start packing." : "Choose kits to build a packing list for this trip."
        ) {
            if hasKits {
                Button("Add items to kits") { store.send(.setView(.kits)) }.fontWeight(.semibold)
            } else {
                Button("Choose kits", systemImage: "plus") { sheet = .settings }.buttonStyle(.pill)
            }
        }
    }

    // MARK: Packing order

    private func toggle(_ id: ItemId) {
        // Checkmark, counters, persistence and haptic update now; rows move a beat later.
        if packingOrder == nil { packingOrder = trip.checked }
        lastToggled = id
        reorderTask?.cancel()
        store.send(.toggleChecked(tripId: trip.id, itemId: id))
        hapticTick += 1
        reorderTask = Task { @MainActor in
            // Long enough for the tick to draw on and the strike to sweep across.
            try? await Task.sleep(for: .milliseconds(reduceMotion ? 80 : 260))
            guard !Task.isCancelled else { return }
            withAnimation(reduceMotion ? nil : .spring(duration: 0.45, bounce: 0.15)) { packingOrder = nil }
            reorderTask = nil
        }
    }

    private func clearReorder() {
        reorderTask?.cancel()
        reorderTask = nil
        packingOrder = nil
    }
}

/// Row highlight for the custom checklist card.
private struct RowPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? Theme.raised : Theme.panel)
    }
}

/// The trip's packing progress: a big rolling counter on a tinted card that turns
/// moss green — with a little burst — when everything is packed.
private struct ProgressHero: View {
    let progress: PackProgress
    /// Bumped when the trip becomes fully packed.
    let celebrate: Int
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let p = progress
        let complete = p.checked == p.total
        let left = p.total - p.checked
        let tint = complete ? Theme.moss : Theme.accent
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                HStack(alignment: .firstTextBaseline, spacing: 1) {
                    Text("\(p.checked)")
                        .font(Theme.counter(.largeTitle))
                        .foregroundStyle(tint)
                        .contentTransition(.numericText(value: Double(p.checked)))
                    Text("/\(p.total)")
                        .font(Theme.counter(.title3, weight: .semibold))
                        .foregroundStyle(Theme.inkDim)
                        .contentTransition(.numericText(value: Double(p.total)))
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(p.checked) of \(p.total) packed")
                Spacer(minLength: 12)
                if complete {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.title)
                        .foregroundStyle(Theme.moss)
                        .symbolEffect(.bounce, options: .speed(0.8), value: celebrate)
                        .overlay { CelebrationBurst(trigger: celebrate, tint: Theme.moss) }
                        .transition(reduceMotion ? .opacity : .scale(scale: 0.4).combined(with: .opacity))
                        .accessibilityHidden(true)
                }
            }
            PackBar(value: Double(p.checked) / Double(max(p.total, 1)), tint: tint, height: 8)
            Text(complete ? "All packed. Have a great trip!" : "\(left) item\(left == 1 ? "" : "s") left to pack")
                .font(.subheadline.weight(complete ? .semibold : .regular))
                .foregroundStyle(complete ? Theme.moss : Theme.inkDim)
                .contentTransition(.numericText(value: Double(left)))
        }
        .card(padding: 20, fill: LinearGradient(
            colors: [tint.opacity(0.13), Theme.panel],
            startPoint: .topLeading, endPoint: .bottomTrailing
        ).blendMode(.normal))
        .background(Theme.panel, in: .rect(cornerRadius: Theme.cardRadius))
        .animation(reduceMotion ? nil : .spring(duration: 0.45, bounce: 0.2), value: p)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Packing progress")
    }
}

/// A one-shot ring of sparks from the centre of its parent.
private struct CelebrationBurst: View {
    let trigger: Int
    let tint: Color
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if !reduceMotion {
            Canvas { _, _ in }
                .frame(width: 1, height: 1)
                .keyframeAnimator(initialValue: 0.0, trigger: trigger) { content, t in
                    content.overlay {
                        Canvas { ctx, size in
                            guard t > 0, t < 1 else { return }
                            let c = CGPoint(x: size.width / 2, y: size.height / 2)
                            for i in 0..<10 {
                                let angle = Double(i) / 10 * 2 * .pi + 0.3
                                let r0 = 16 + 22 * t, r1 = r0 + 9 * (1 - t)
                                var path = Path()
                                path.move(to: CGPoint(x: c.x + cos(angle) * r0, y: c.y + sin(angle) * r0))
                                path.addLine(to: CGPoint(x: c.x + cos(angle) * r1, y: c.y + sin(angle) * r1))
                                ctx.stroke(path, with: .color(i.isMultiple(of: 2) ? tint : Theme.accent),
                                           style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                            }
                            ctx.opacity = 1 - t
                        }
                        .frame(width: 120, height: 120)
                        .opacity(1 - t * t)
                    }
                } keyframes: { _ in
                    LinearKeyframe(0.0, duration: 0.01)
                    CubicKeyframe(0.999, duration: 0.65)
                    LinearKeyframe(1.0, duration: 0.01)
                }
                .allowsHitTesting(false)
        }
    }
}

/// `.searchable` only once there is a checklist to search.
private struct ChecklistSearch: ViewModifier {
    let enabled: Bool
    @Binding var query: String

    func body(content: Content) -> some View {
        if enabled {
            content.searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: Text("Find an item"))
        } else {
            content
        }
    }
}

struct ChecklistGroup: Identifiable {
    let id: String
    let name: String
    let ids: [ItemId]
}

/// Groups the checklist by the exact set of the trip's kits that contain each item, in
/// checklist (kit) order. Items shared by several kits form their own "A + B" group.
func checklistGroups(_ trip: Trip, kits: [Kit]) -> [ChecklistGroup] {
    var order: [String] = []
    var names: [String: String] = [:]
    var ids: [String: [ItemId]] = [:]
    for id in tripChecklist(trip, kits: kits) {
        let owners = kits.filter { trip.kitIds.contains($0.id) && $0.itemIds.contains(id) }
        let key = owners.map(\.id.rawValue).sorted().joined(separator: "+")
        if ids[key] == nil {
            order.append(key)
            names[key] = owners.map(\.name).joined(separator: " + ")
        }
        ids[key, default: []].append(id)
    }
    return order.map { ChecklistGroup(id: $0, name: names[$0] ?? "", ids: ids[$0] ?? []) }
}
