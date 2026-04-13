import { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descKey: string;
  bulletKeys?: string[];
}

const CASUAL_SLIDES: Slide[] = [
  {
    icon: "wallet-outline",
    titleKey: "tutorialSlides.casual.welcome.title",
    descKey: "tutorialSlides.casual.welcome.desc",
  },
  {
    icon: "pie-chart-outline",
    titleKey: "tutorialSlides.casual.overview.title",
    descKey: "tutorialSlides.casual.overview.desc",
  },
  {
    icon: "happy-outline",
    titleKey: "tutorialSlides.casual.spending.title",
    descKey: "tutorialSlides.casual.spending.desc",
  },
  {
    icon: "add-circle-outline",
    titleKey: "tutorialSlides.casual.addTransaction.title",
    descKey: "tutorialSlides.casual.addTransaction.desc",
    bulletKeys: [
      "tutorialSlides.casual.addTransaction.bullet1",
      "tutorialSlides.casual.addTransaction.bullet2",
      "tutorialSlides.casual.addTransaction.bullet3",
      "tutorialSlides.casual.addTransaction.bullet4",
      "tutorialSlides.casual.addTransaction.bullet5",
    ],
  },
  {
    icon: "business-outline",
    titleKey: "tutorialSlides.casual.accounts.title",
    descKey: "tutorialSlides.casual.accounts.desc",
    bulletKeys: [
      "tutorialSlides.casual.accounts.bullet1",
      "tutorialSlides.casual.accounts.bullet2",
      "tutorialSlides.casual.accounts.bullet3",
    ],
  },
  {
    icon: "settings-outline",
    titleKey: "tutorialSlides.casual.dataSettings.title",
    descKey: "tutorialSlides.casual.dataSettings.desc",
    bulletKeys: [
      "tutorialSlides.casual.dataSettings.bullet1",
      "tutorialSlides.casual.dataSettings.bullet2",
      "tutorialSlides.casual.dataSettings.bullet3",
      "tutorialSlides.casual.dataSettings.bullet4",
    ],
  },
];

const PRO_SLIDES: Slide[] = [
  {
    icon: "star-outline",
    titleKey: "tutorialSlides.pro.welcome.title",
    descKey: "tutorialSlides.pro.welcome.desc",
  },
  {
    icon: "apps-outline",
    titleKey: "tutorialSlides.pro.navigation.title",
    descKey: "tutorialSlides.pro.navigation.desc",
    bulletKeys: [
      "tutorialSlides.pro.navigation.bullet1",
      "tutorialSlides.pro.navigation.bullet2",
      "tutorialSlides.pro.navigation.bullet3",
    ],
  },
  {
    icon: "wallet-outline",
    titleKey: "tutorialSlides.pro.budgets.title",
    descKey: "tutorialSlides.pro.budgets.desc",
    bulletKeys: [
      "tutorialSlides.pro.budgets.bullet1",
      "tutorialSlides.pro.budgets.bullet2",
      "tutorialSlides.pro.budgets.bullet3",
    ],
  },
  {
    icon: "bookmark-outline",
    titleKey: "tutorialSlides.pro.categories.title",
    descKey: "tutorialSlides.pro.categories.desc",
    bulletKeys: [
      "tutorialSlides.pro.categories.bullet1",
      "tutorialSlides.pro.categories.bullet2",
      "tutorialSlides.pro.categories.bullet3",
    ],
  },
  {
    icon: "pricetag-outline",
    titleKey: "tutorialSlides.pro.tags.title",
    descKey: "tutorialSlides.pro.tags.desc",
    bulletKeys: [
      "tutorialSlides.pro.tags.bullet1",
      "tutorialSlides.pro.tags.bullet2",
      "tutorialSlides.pro.tags.bullet3",
    ],
  },
  {
    icon: "funnel-outline",
    titleKey: "tutorialSlides.pro.rules.title",
    descKey: "tutorialSlides.pro.rules.desc",
    bulletKeys: [
      "tutorialSlides.pro.rules.bullet1",
      "tutorialSlides.pro.rules.bullet2",
      "tutorialSlides.pro.rules.bullet3",
    ],
  },
  {
    icon: "link-outline",
    titleKey: "tutorialSlides.pro.plaid.title",
    descKey: "tutorialSlides.pro.plaid.desc",
    bulletKeys: [
      "tutorialSlides.pro.plaid.bullet1",
      "tutorialSlides.pro.plaid.bullet2",
      "tutorialSlides.pro.plaid.bullet3",
    ],
  },
  {
    icon: "sparkles-outline",
    titleKey: "tutorialSlides.pro.extras.title",
    descKey: "tutorialSlides.pro.extras.desc",
    bulletKeys: [
      "tutorialSlides.pro.extras.bullet1",
      "tutorialSlides.pro.extras.bullet2",
      "tutorialSlides.pro.extras.bullet3",
      "tutorialSlides.pro.extras.bullet4",
    ],
  },
];

interface Props {
  visible: boolean;
  variant: "casual" | "pro";
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function Tutorial({ visible, variant, onClose }: Props) {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const slides = variant === "pro" ? PRO_SLIDES : CASUAL_SLIDES;
  const brandColor = variant === "casual" ? "#10b981" : theme.brand;
  const isLastPage = currentPage === slides.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleNext = () => {
    if (isLastPage) {
      setCurrentPage(0);
      onClose();
    } else {
      scrollRef.current?.scrollTo({ x: (currentPage + 1) * SCREEN_WIDTH, animated: true });
    }
  };

  const handleClose = () => {
    setCurrentPage(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Close button */}
        <TouchableOpacity style={[styles.closeBtn, { top: insets.top + 12 }]} onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Page counter */}
        <View style={[styles.counter, { top: insets.top + 16 }]}>
          <Text style={[styles.counterText, { color: theme.textSecondary }]}>
            {currentPage + 1} / {slides.length}
          </Text>
        </View>

        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={index} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <View style={[styles.iconCircle, { backgroundColor: brandColor + "15" }]}>
                <Ionicons name={slide.icon} size={48} color={brandColor} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>{i18n(slide.titleKey)}</Text>
              <Text style={[styles.desc, { color: theme.textSecondary }]}>{i18n(slide.descKey)}</Text>
              {slide.bulletKeys && (
                <View style={styles.bullets}>
                  {slide.bulletKeys.map((key, bi) => (
                    <View key={bi} style={styles.bulletRow}>
                      <Ionicons name="checkmark-circle" size={18} color={brandColor} />
                      <Text style={[styles.bulletText, { color: theme.text }]}>{i18n(key)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Page dots */}
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentPage ? brandColor : theme.cardBorder,
                  width: index === currentPage ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: brandColor }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextText, { color: theme.brandText }]}>
            {isLastPage ? i18n("tutorialSlides.getStarted") : i18n("tutorialSlides.next")}
          </Text>
          {!isLastPage && <Ionicons name="arrow-forward" size={18} color={theme.brandText} />}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  counter: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  counterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  desc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },
  bullets: {
    alignSelf: "stretch",
    gap: 12,
    paddingHorizontal: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 40,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
