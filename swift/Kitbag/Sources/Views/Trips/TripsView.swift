import ObservableStore
import SwiftUI
import KitbagCore

/// Trips tab: list of active/archived trips, with the selected trip pushed from the store.
struct TripsView: View {
    @EnvironmentObject private var store: Store<AppModel>
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var query = ""
    @State private var archivedView = false
    /// Sheet over the trip detail; `.setup` right after creating a trip.
    @State private var sheet: TripSheet?

    @State private var creating = false
    @State private var packingAgain: Trip?
    @State private var renaming: Trip?
    @State private var deleting: Trip?
    @State private var draft = ""

    private var trips: [Trip] { store.state.data.trips }
    private var kits: [Kit] { store.state.data.kits }

    private var path: Binding<[TripId]> {
        Binding(
            get: { store.state.selectedTripId.map { [$0] } ?? [] },
            set: { store.send(.selectTrip($0.last)) }
        )
    }

    var body: some View {
        NavigationStack(path: path) {
            list
                .navigationTitle("Trips")
                .navigationSubtitle("Less remembering. More going.")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button("New trip", systemImage: "plus", action: startCreate)
                    }
                }
                .navigationDestination(for: TripId.self) { id in
                    if let trip = trips.first(where: { $0.id == id }) {
                        TripDetailView(trip: trip, sheet: $sheet, toggleArchived: toggleArchived).id(trip.id)
                    } else {
                        ContentUnavailableView("Trip not found", systemImage: "suitcase")
                    }
                }
        }
        .onChange(of: archivedView) { query = "" }
        .alert("New trip", isPresented: $creating) {
            TextField("e.g. Weekend on the coast", text: $draft.capped)
                .textInputAutocapitalization(.sentences)
            Button("Cancel", role: .cancel) {}
            Button("Create", action: create).disabled(draft.tripTrimmed.isEmpty)
        } message: {
            Text("Where are you headed? Give your packing list a name.")
        }
        .alert("Pack again", isPresented: $packingAgain.tripPresented, presenting: packingAgain) { trip in
            TextField("Name", text: $draft.capped)
            Button("Cancel", role: .cancel) {}
            Button("Create trip") { packAgain(trip) }.disabled(draft.tripTrimmed.isEmpty)
        } message: { _ in
            Text("Reuse these kits with a fresh checklist. The original trip keeps its packing progress.")
        }
        .alert("Rename trip", isPresented: $renaming.tripPresented, presenting: renaming) { trip in
            TextField("Trip name", text: $draft.capped)
            Button("Cancel", role: .cancel) {}
            Button("Save") {
                let name = draft.tripTrimmed
                if !name.isEmpty, name != trip.name { store.send(.renameTrip(id: trip.id, name: name)) }
            }
            .disabled(draft.tripTrimmed.isEmpty)
        }
        .confirmationDialog(
            deleting.map { "Delete “\($0.name)”?" } ?? "",
            isPresented: $deleting.tripPresented,
            titleVisibility: .visible,
            presenting: deleting
        ) { trip in
            Button("Delete", role: .destructive) { store.send(.deleteTrip(id: trip.id)) }
        } message: { _ in
            Text("This packing list and its progress will be removed. Your kits and items stay in your library.")
        }
    }

    // MARK: List

    private var matching: [Trip] {
        let q = query.tripTrimmed.lowercased()
        return trips.reversed().filter {
            ($0.archived ?? false) == archivedView && (q.isEmpty || $0.name.lowercased().contains(q))
        }
    }

    @ViewBuilder private var list: some View {
        if trips.isEmpty {
            EmptyState(
                symbol: "suitcase.rolling",
                badge: "plus.circle.fill",
                title: "Your next trip starts here",
                message: "Create a trip, choose the kits that fit, and get one checklist with everything you need."
            ) {
                Button("Plan your first trip", systemImage: "plus", action: startCreate)
                    .buttonStyle(.pill)
            }
            .themedScreen()
        } else {
            let matching = matching
            let archivedCount = trips.filter { $0.archived ?? false }.count
            List {
                Section {
                    Picker("Trip lists", selection: $archivedView) {
                        Text("Active · \(trips.count - archivedCount)")
                            .accessibilityLabel("Active trips")
                            .tag(false)
                        Text("Archived · \(archivedCount)")
                            .accessibilityLabel("Archived trips")
                            .tag(true)
                    }
                    .pickerStyle(.segmented)
                    .cardRow(top: 4, bottom: 10)
                }
                ForEach(matching) { trip in
                    row(trip).cardRow()
                }
            }
            .listStyle(.plain)
            .themedScreen()
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search trips")
            .overlay { emptyState(matching) }
            .animation(reduceMotion ? nil : .default, value: matching.map(\.id))
        }
    }

    @ViewBuilder private func emptyState(_ matching: [Trip]) -> some View {
        if matching.isEmpty {
            if query.tripTrimmed.isEmpty {
                EmptyState(
                    symbol: archivedView ? "archivebox" : "sun.horizon",
                    title: archivedView ? "No archived trips" : "No active trips",
                    message: archivedView
                        ? "Archive a trip to keep its progress and make room for your next adventure."
                        : "Your past trips are in the archive. Plan a new one whenever you’re ready."
                ) {
                    if !archivedView {
                        Button("Plan a trip", systemImage: "plus", action: startCreate).buttonStyle(.pill)
                    }
                }
                .id(archivedView)
            } else {
                EmptyState(
                    symbol: "magnifyingglass",
                    title: "No trips found",
                    message: "Try a different name, or plan a new trip."
                ) {
                    Button("Clear search") { query = "" }.fontWeight(.semibold)
                }
            }
        }
    }

    private func row(_ trip: Trip) -> some View {
        Button { store.send(.selectTrip(trip.id)) } label: {
            TripCard(trip: trip, kits: kits)
        }
        .buttonStyle(CardButtonStyle())
        .accessibilityLabel(trip.name)
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button("Delete", systemImage: "trash", role: .destructive) { deleting = trip }
                .tint(.red)
            archiveButton(trip).tint(Theme.inkFaint)
        }
        .swipeActions(edge: .leading) {
            if !trip.kitIds.isEmpty {
                packAgainButton(trip).tint(Theme.moss)
            }
        }
        .contextMenu {
            if !trip.kitIds.isEmpty { packAgainButton(trip) }
            Button("Rename", systemImage: "pencil") { draft = trip.name; renaming = trip }
            archiveButton(trip)
            Divider()
            Button("Delete", systemImage: "trash", role: .destructive) { deleting = trip }
        }
        // Swipe actions already appear as VoiceOver actions; Rename is only in the context menu.
        .accessibilityAction(named: "Rename") { draft = trip.name; renaming = trip }
    }

    private func packAgainButton(_ trip: Trip) -> some View {
        Button("Pack again", systemImage: "arrow.clockwise") { startPackAgain(trip) }
    }

    private func archiveButton(_ trip: Trip) -> some View {
        let archived = trip.archived ?? false
        return Button(archived ? "Restore" : "Archive",
                      systemImage: archived ? "tray.and.arrow.up" : "archivebox") { toggleArchived(trip) }
    }

    // MARK: Actions

    private func startCreate() {
        draft = ""
        creating = true
    }

    private func create() {
        let name = draft.tripTrimmed
        guard !name.isEmpty else { return }
        let id = newTripId()
        store.send(.createTrip(id: id, name: name, createdAt: tripCreatedAtNow()))
        query = ""
        archivedView = false
        store.send(.selectTrip(id))
        // Ask for kits once the alert has gone and the push has landed, so the
        // sheet rises over a settled screen instead of mid-transition.
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(reduceMotion ? 150 : 500))
            if store.state.selectedTripId == id { sheet = .setup }
        }
    }

    private func startPackAgain(_ trip: Trip) {
        draft = String("\(trip.name) again".prefix(120))
        packingAgain = trip
    }

    private func packAgain(_ source: Trip) {
        let name = draft.tripTrimmed
        guard !name.isEmpty else { return }
        let id = newTripId()
        store.send(.duplicateTrip(sourceId: source.id, id: id, name: name, createdAt: tripCreatedAtNow()))
        query = ""
        archivedView = false
        sheet = nil
        store.send(.selectTrip(id))
    }

    /// Shared by the list, the detail's "Restore trip" and Trip settings (TS `archive()`).
    private func toggleArchived(_ trip: Trip) {
        let archived = trip.archived ?? false
        store.send(.setTripArchived(id: trip.id, archived: !archived))
        query = ""
        if archived { archivedView = false }
    }
}

/// One trip in the list: status pill, name, kit chips and a packing bar.
private struct TripCard: View {
    let trip: Trip
    let kits: [Kit]

    var body: some View {
        let progress = packProgress(trip, kits: kits)
        let complete = progress.total > 0 && progress.checked == progress.total
        let kitNames = trip.kitIds.compactMap { id in kits.first { $0.id == id }?.name }
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center) {
                statusPill(progress, complete: complete)
                Spacer()
                if let date = tripDate(trip.createdAt) {
                    Text(date, format: .dateTime.month(.abbreviated).day())
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Theme.inkFaint)
                }
            }
            HStack(alignment: .firstTextBaseline) {
                Text(trip.name)
                    .font(Theme.cardTitle())
                    .tracking(-0.4)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.inkFaint)
            }
            .padding(.top, 12)
            if !kitNames.isEmpty {
                OverflowRow {
                    ForEach(Array(kitNames.enumerated()), id: \.offset) { _, name in
                        Chip(text: name)
                    }
                }
                .padding(.top, 10)
            }
            if progress.total > 0 {
                HStack(spacing: 12) {
                    PackBar(value: Double(progress.checked) / Double(progress.total),
                            tint: complete ? Theme.moss : Theme.accent)
                    Text("\(progress.checked)/\(progress.total)")
                        .font(Theme.counter(.subheadline, weight: .semibold))
                        .foregroundStyle(complete ? Theme.moss : Theme.inkDim)
                }
                .padding(.top, 16)
            } else {
                Text("Choose kits to build your checklist")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkDim)
                    .padding(.top, 12)
            }
        }
        .card()
        .accessibilityElement(children: .combine)
        .accessibilityValue(progress.total > 0
            ? "\(status(progress, complete: complete)), \(progress.checked) of \(progress.total) packed"
            : status(progress, complete: complete))
    }

    @ViewBuilder private func statusPill(_ p: PackProgress, complete: Bool) -> some View {
        let label = status(p, complete: complete)
        if trip.archived == true {
            Chip(text: label, systemImage: "archivebox")
        } else if complete {
            Chip(text: label, systemImage: "checkmark", tint: Theme.moss, fill: Theme.moss.opacity(0.16))
        } else if p.checked > 0 {
            Chip(text: label, systemImage: "bag", tint: Theme.accent, fill: Theme.accent.opacity(0.14))
        } else {
            Chip(text: label)
        }
    }

    private func status(_ p: PackProgress, complete: Bool) -> String {
        if trip.archived == true { return "Archived" }
        if complete { return "Ready to go" }
        if p.checked > 0 { return "Packing" }
        if p.total > 0 { return "Ready to pack" }
        return "Planning"
    }
}

enum TripSheet: String, Identifiable {
    case setup, settings
    var id: String { rawValue }
}

extension String {
    var tripTrimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}

extension String {
    /// Names are limited to 120 characters, like the TS inputs' `maxlength`.
    var capped: String {
        get { self }
        set { self = newValue.count > 120 ? String(newValue.prefix(120)) : newValue }
    }
}

extension Optional {
    /// Presentation binding for "present while non-nil" alerts and dialogs.
    var tripPresented: Bool {
        get { self != nil }
        set { if !newValue { self = nil } }
    }
}

/// Matches JS `new Date().toISOString()`.
func tripCreatedAtNow() -> String {
    Date.now.formatted(Date.ISO8601FormatStyle(includingFractionalSeconds: true))
}

func tripDate(_ iso: String) -> Date? {
    (try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(iso))
        ?? (try? Date.ISO8601FormatStyle().parse(iso))
}
