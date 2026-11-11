import SwiftUI
import UIKit

/// Turbolists' look, defined once: the moss-tinted palette of the original web app
/// (dark) with a matching warm-paper light appearance, plus the shared type, card,
/// chip, progress and empty-state pieces the screens are built from.
enum Theme {
    // MARK: Palette (light, dark)

    /// Screen background. Dark is the original `--bg`.
    static let background = Color(light: 0xF1F2EA, dark: 0x10120F)
    /// Cards and grouped rows (`--panel`).
    static let panel = Color(light: 0xFCFDF8, dark: 0x1A1D18)
    /// Chips, tiles and tracks on a card (`--panel-2`).
    static let raised = Color(light: 0xE6E9DE, dark: 0x262A22)
    /// Hairlines and progress tracks (`--line`).
    static let line = Color(light: 0xD9DECF, dark: 0x30362B)
    /// Warm off-white ink (`--ink`) / deep olive ink.
    static let ink = Color(light: 0x1A1E17, dark: 0xF1F3EB)
    /// Muted sage secondary text (`--ink-dim`). ≥ 6:1 on panel in both schemes.
    static let inkDim = Color(light: 0x535D4B, dark: 0xA5AF9C)
    /// Tertiary text (`--ink-faint`). ≥ 4.5:1 on panel in both schemes.
    static let inkFaint = Color(light: 0x646E5B, dark: 0x8C9783)
    /// The system blue with its chroma softened (the original's `--accent-chroma: 0.75`).
    static let accent = Color(light: 0x2F70C8, dark: 0x4D8EE0)
    /// "All packed": a leafy moss green.
    static let moss = Color(light: 0x3B7629, dark: 0x9DCB7A)
    /// Ink on a moss fill: white on the deep light-mode moss, near-black on the pale dark-mode one.
    static let onMoss = Color(light: 0xFFFFFF, dark: 0x10120F)
    static let danger = Color(light: 0xC2412F, dark: 0xFF8A78)

    // MARK: Type

    /// Card titles: compact and confident (the original's tight `-0.03em` headings).
    static func cardTitle(_ style: Font.TextStyle = .title3) -> Font { .system(style, weight: .semibold) }
    /// Counters: rounded, tabular digits.
    static func counter(_ style: Font.TextStyle, weight: Font.Weight = .bold) -> Font {
        .system(style, design: .rounded, weight: weight).monospacedDigit()
    }

    static let cardRadius: CGFloat = 22

    /// Large navigation titles in ink with the original's tight tracking.
    @MainActor static func configureNavigationBar() {
        let ink = UIColor(Theme.ink)
        let large = UIFontMetrics(forTextStyle: .largeTitle)
            .scaledFont(for: .systemFont(ofSize: 34, weight: .bold))
        let inline = UIFontMetrics(forTextStyle: .headline)
            .scaledFont(for: .systemFont(ofSize: 17, weight: .semibold))
        let bar = UINavigationBar.appearance()
        bar.largeTitleTextAttributes = [.font: large, .kern: -0.9, .foregroundColor: ink]
        bar.titleTextAttributes = [.font: inline, .kern: -0.2, .foregroundColor: ink]
    }
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

private extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

// MARK: - Screen and list styling

extension View {
    /// Moss background behind a screen's scroll content and empty states.
    func themedScreen() -> some View {
        scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
    }

    /// A grouped-list row on a panel, with olive hairlines.
    func themedRow() -> some View {
        listRowBackground(Theme.panel)
            .listRowSeparatorTint(Theme.line)
    }

    /// A grouped row inside a sheet: a translucent sage wash that sits well on the
    /// sheet's glass (medium detent) and its opaque background (large detent).
    func sheetRow() -> some View {
        listRowBackground(Theme.raised.opacity(0.55))
            .listRowSeparatorTint(Theme.line)
    }

    /// A row that draws its own card: no system background, separator or insets.
    /// `horizontal` is 16 in plain lists; 0 in grouped lists, which already inset sections.
    func cardRow(top: CGFloat = 6, bottom: CGFloat = 6, horizontal: CGFloat = 16) -> some View {
        listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: top, leading: horizontal, bottom: bottom, trailing: horizontal))
    }

    /// Card surface: panel, continuous corners and a hairline (the original `.card`).
    func card(padding: CGFloat = 18, fill: some ShapeStyle = Theme.panel) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(fill, in: .rect(cornerRadius: Theme.cardRadius))
            .overlay {
                RoundedRectangle(cornerRadius: Theme.cardRadius)
                    .strokeBorder(Theme.line.opacity(0.8), lineWidth: 1)
            }
            .contentShape(.rect(cornerRadius: Theme.cardRadius))
            .contentShape(.contextMenuPreview, .rect(cornerRadius: Theme.cardRadius))
    }
}

/// A gentle press: cards sink slightly under the finger.
struct CardButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.975 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(reduceMotion ? nil : .spring(duration: 0.25, bounce: 0.4), value: configuration.isPressed)
    }
}

/// Section header in ink, not the system's shouting grey caps.
struct GroupHeader: View {
    var title: String
    var count: String? = nil
    /// Spoken form of `count`, e.g. "4 of 7 packed" for "4/7".
    var countLabel: String? = nil
    var countTint: Color = Theme.inkDim

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.ink)
            Spacer()
            if let count {
                Text(count)
                    .font(Theme.counter(.footnote, weight: .semibold))
                    .foregroundStyle(countTint)
                    .contentTransition(.numericText())
            }
        }
        .textCase(nil)
        .padding(.horizontal, 4)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel([title, countLabel ?? count].compactMap { $0 }.joined(separator: ", "))
        .accessibilityAddTraits(.isHeader)
    }
}

// MARK: - Chips and progress

struct Chip: View {
    var text: String
    var systemImage: String? = nil
    var tint: Color = Theme.inkDim
    var fill: Color = Theme.raised

    var body: some View {
        HStack(spacing: 4) {
            if let systemImage {
                Image(systemName: systemImage).imageScale(.small)
            }
            Text(text).lineLimit(1)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(tint)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(fill, in: .capsule)
    }
}

/// Lays children out in a row and drops whichever don't fit (no wrapping, no squashing).
struct OverflowRow: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        let width = proposal.width ?? sizes.reduce(0) { $0 + $1.width + spacing }
        var used: CGFloat = 0
        var height: CGFloat = 0
        for size in sizes {
            let next = used == 0 ? size.width : used + spacing + size.width
            if next > width { break }
            used = next
            height = max(height, size.height)
        }
        return CGSize(width: proposal.width ?? used, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX + 0.5 {
                // Park it out of sight.
                subview.place(at: CGPoint(x: -10_000, y: bounds.minY), proposal: .zero)
                x = .infinity
                continue
            }
            subview.place(at: CGPoint(x: x, y: bounds.midY), anchor: .leading, proposal: .unspecified)
            x += size.width + spacing
        }
    }
}

/// Capsule progress bar with a springy fill.
struct PackBar: View {
    var value: Double
    var tint: Color
    var height: CGFloat = 6
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Capsule()
            .fill(Theme.line)
            .frame(height: height)
            .overlay(alignment: .leading) {
                GeometryReader { geo in
                    Capsule()
                        .fill(tint.gradient)
                        .frame(width: value > 0 ? max(height, geo.size.width * min(value, 1)) : 0)
                }
            }
            .clipShape(.capsule)
            .animation(reduceMotion ? nil : .spring(duration: 0.5, bounce: 0.25), value: value)
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: tint)
            .accessibilityHidden(true)
    }
}

// MARK: - Check box and strike-through

/// Round check box: the ring fills and the tick draws itself on.
struct CheckBox: View {
    var checked: Bool
    var tint: Color = Theme.accent
    @ScaledMetric(relativeTo: .body) private var size: CGFloat = 26
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Circle()
                .strokeBorder(checked ? tint : Theme.inkFaint, lineWidth: 1.6)
            Circle()
                .fill(tint)
                .scaleEffect(checked ? 1 : 0.4)
                .opacity(checked ? 1 : 0)
            Image(systemName: "checkmark")
                .font(.system(size: size * 0.48, weight: .bold))
                .foregroundStyle(tint == Theme.moss ? Theme.onMoss : .white)
                .symbolEffect(.drawOff, options: reduceMotion ? .speed(4) : .default, isActive: !checked)
                .opacity(checked ? 1 : 0)
        }
        .frame(width: size, height: size)
        .animation(reduceMotion ? nil : .spring(duration: 0.3, bounce: 0.45), value: checked)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.4), value: tint)
        .accessibilityHidden(true)
    }
}

/// Draws a strike-through that sweeps across each line of text as `progress` goes 0 → 1.
struct StrikeRenderer: TextRenderer {
    var progress: Double
    var color: Color

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func draw(layout: Text.Layout, in ctx: inout GraphicsContext) {
        for line in layout { ctx.draw(line) }
        guard progress > 0 else { return }
        let lines = Array(layout)
        let total = lines.reduce(0) { $0 + $1.typographicBounds.width }
        var remaining = total * progress
        for line in lines where remaining > 0 {
            let bounds = line.typographicBounds
            let width = min(bounds.width, remaining)
            remaining -= width
            let midY = bounds.origin.y - bounds.ascent * 0.32
            let rect = CGRect(x: bounds.rect.minX, y: midY - 0.75, width: width, height: 1.5)
            ctx.fill(Path(roundedRect: rect, cornerRadius: 0.75), with: .color(color))
        }
    }
}

extension Text {
    /// Strike-through that animates in and out with the surrounding animation.
    func animatedStrike(_ on: Bool, color: Color = Theme.inkFaint) -> some View {
        textRenderer(StrikeRenderer(progress: on ? 1 : 0, color: color))
    }
}

// MARK: - Empty states

/// A friendlier `ContentUnavailableView`: a symbol on a soft tile that greets you
/// with a little bounce, a tight headline, sage copy and the actions.
struct EmptyState<Actions: View>: View {
    var symbol: String
    var badge: String? = nil
    var tint: Color = Theme.accent
    var title: String
    var message: String
    @ViewBuilder var actions: Actions

    @ScaledMetric(relativeTo: .largeTitle) private var tile: CGFloat = 80
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var greeted = 0

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .bottomTrailing) {
                RoundedRectangle(cornerRadius: tile * 0.32)
                    .fill(Theme.raised)
                    .overlay {
                        RoundedRectangle(cornerRadius: tile * 0.32)
                            .fill(tint.opacity(0.12))
                    }
                    .frame(width: tile, height: tile)
                    .overlay {
                        Image(systemName: symbol)
                            .font(.system(size: tile * 0.42, weight: .medium))
                            .foregroundStyle(tint)
                            .symbolEffect(.bounce.up.byLayer, options: .nonRepeating, value: greeted)
                    }
                if let badge {
                    Image(systemName: badge)
                        .font(.system(size: tile * 0.26, weight: .bold))
                        .foregroundStyle(.white, tint)
                        .symbolRenderingMode(.palette)
                        .background(Circle().fill(Theme.background).padding(-3))
                        .offset(x: tile * 0.12, y: tile * 0.12)
                        .symbolEffect(.bounce, options: .nonRepeating, value: greeted)
                }
            }
            .padding(.bottom, 24)
            .accessibilityHidden(true)

            Text(title)
                .font(.title2.weight(.bold))
                .tracking(-0.5)
                .foregroundStyle(Theme.ink)
                .accessibilityAddTraits(.isHeader)
            Text(message)
                .font(.callout)
                .foregroundStyle(Theme.inkDim)
                .lineSpacing(3)
                .frame(maxWidth: 300)
                .padding(.top, 10)
            VStack(spacing: 12) { actions }
                .padding(.top, 26)
        }
        .multilineTextAlignment(.center)
        .padding(.horizontal, 28)
        .padding(.vertical, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            guard !reduceMotion else { return }
            try? await Task.sleep(for: .milliseconds(250))
            greeted += 1
        }
    }
}

extension EmptyState where Actions == EmptyView {
    init(symbol: String, badge: String? = nil, tint: Color = Theme.accent, title: String, message: String) {
        self.init(symbol: symbol, badge: badge, tint: tint, title: title, message: message) { EmptyView() }
    }
}

/// Prominent pill button for empty-state calls to action.
struct PillButtonStyle: ButtonStyle {
    var tint: Color = Theme.accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 22)
            .padding(.vertical, 13)
            .background(tint.gradient, in: .capsule)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.96 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(reduceMotion ? nil : .spring(duration: 0.25, bounce: 0.45), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PillButtonStyle {
    static var pill: PillButtonStyle { PillButtonStyle() }
}
