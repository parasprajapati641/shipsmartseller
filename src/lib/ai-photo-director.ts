// AI Product Photo Director — Pre-Upload Shot Guidance
// Provides real-time camera setup, angle, lighting, and framing recommendations.

export type PhotoDirectorGuidance = {
  category: string;
  recommendedAngle: string;
  lightingSetup: string;
  backgroundStyle: string;
  framingMarginPct: string;
  lensRecommendation: string;
  marketplaceTip: string;
  proTips: string[];
};

export const DIRECTOR_GUIDANCE_DB: Record<string, PhotoDirectorGuidance> = {
  apparel: {
    category: "Apparel & Clothing",
    recommendedAngle: "Eye-level flat-lay or mannequin 90° straight-on elevation.",
    lightingSetup: "Dual softbox diffuse lights at 45° left & right to eliminate harsh shadows.",
    backgroundStyle: "Seamless matte white board (RGB 255, 255, 255).",
    framingMarginPct: "2% to 4% margin only (Subject fills 88%–92% of square frame).",
    lensRecommendation: "50mm or 85mm prime lens to eliminate wide-angle barrel distortion.",
    marketplaceTip: "Meesho algorithm penalizes excess white space. Keep clothing zoomed close.",
    proTips: [
      "Iron or steam fabric thoroughly to eliminate micro-wrinkles.",
      "Align sleeve folds symmetrically for clean visual geometry.",
    ],
  },
  footwear: {
    category: "Footwear & Shoes",
    recommendedAngle: "Three-quarter 45° side profile with toe pointing toward camera right.",
    lightingSetup:
      "High key top light with front fill reflector to highlight leather / mesh textures.",
    backgroundStyle: "Pure white vinyl studio sweep.",
    framingMarginPct: "3% side margin (Shoe length fills 90% horizontal span).",
    lensRecommendation: "90mm macro lens for crisp detail on stitching and sole grips.",
    marketplaceTip: "Flipkart buyers inspect sole quality — include a secondary 90° sole shot.",
    proTips: [
      "Stuff shoe interior with tissue paper to preserve structure.",
      "Clean outsoles thoroughly with microfiber cloth before shooting.",
    ],
  },
  electronics: {
    category: "Electronics & Gadgets",
    recommendedAngle: "Straight-on 90° front elevation with slight top tilt.",
    lightingSetup:
      "Polarized ring light to prevent glare reflections on screens and glossy plastic.",
    backgroundStyle: "Pure white acrylic sheet.",
    framingMarginPct: "4% margin (88% subject occupancy).",
    lensRecommendation: "60mm macro prime lens.",
    marketplaceTip: "Amazon India requires main photo to have zero graphics, text, or drop shadow.",
    proTips: [
      "Wipe off fingerprints and dust particles with isopropyl alcohol wipes.",
      "Ensure power LEDs or screen indicators are off or uniformly illuminated.",
    ],
  },
  home: {
    category: "Home & Kitchen",
    recommendedAngle: "Straight front elevation at table height.",
    lightingSetup: "Natural window side-light with white bounce card on shadow side.",
    backgroundStyle: "Clean white sweep.",
    framingMarginPct: "3% top/bottom margin.",
    lensRecommendation: "50mm standard prime lens.",
    marketplaceTip: "Clear, bright cookware and decor photos see 30% higher conversion on Meesho.",
    proTips: [
      "Position product handles consistently at 3 o'clock position.",
      "Avoid shooting with overhead ceiling lights to prevent color cast.",
    ],
  },
};

export function getPhotoDirectorGuidance(category: string = "apparel"): PhotoDirectorGuidance {
  return DIRECTOR_GUIDANCE_DB[category] ?? DIRECTOR_GUIDANCE_DB.apparel;
}
