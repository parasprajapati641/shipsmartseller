// AI SEO Generator — E-Commerce Marketplace Catalog Optimization
// Generates SEO Title, SEO Description, Alt Text, Keywords list, SEO Filename, and Meta Description.

export type GeneratedSEOPack = {
  seoTitle: string;
  seoDescription: string;
  altText: string;
  keywords: string[];
  suggestedFilename: string;
  metaDescription: string;
};

export function generateSEOPack(
  rawFilename: string,
  category: string = "apparel",
): GeneratedSEOPack {
  const cleanName = rawFilename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  const seoTitle = `${cleanName} — Premium ${categoryLabel} | Official Catalog Edition`;

  const seoDescription = `High-quality ${cleanName} for online shoppers. Optimized for Meesho, Flipkart, and Amazon India. Features studio white background, premium texture details, and durable quality.`;

  const altText = `Front view of ${cleanName} on pure white studio background for marketplace listing.`;

  const keywords = [
    cleanName.toLowerCase(),
    `${category} online India`,
    `meesho best selling ${category}`,
    `flipkart catalog ${cleanName.toLowerCase()}`,
    `studio white product photo`,
    `buy ${cleanName.toLowerCase()} online`,
  ];

  const slugified = cleanName.toLowerCase().replace(/\s+/g, "-");
  const suggestedFilename = `${slugified}-meesho-optimized-1:1-square.jpg`;

  const metaDescription = `Buy ${cleanName} online at best prices. Verified catalog product with fast shipping and hassle-free returns.`;

  return {
    seoTitle,
    seoDescription,
    altText,
    keywords,
    suggestedFilename,
    metaDescription,
  };
}
