import SwiftUI
import WidgetKit

@main
struct GuowuWidgetBundle: WidgetBundle {
  var body: some Widget {
    GuowuFastingWidget()
    if #available(iOS 16.2, *) {
      GuowuFastingLiveActivity()
    }
  }
}
