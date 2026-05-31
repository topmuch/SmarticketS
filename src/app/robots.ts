import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/agence/",
          "/api/",
          "/activate/",
          "/suivi/",
          "/arrivee/",
          "/retrieve/",
          "/scan/",
          "/sending/",
          "/expired/",
          "/success/",
          "/verify-email/",
          "/forgot-password/",
          "/reset-password/",
        ],
      },
    ],
    sitemap: "https://smartickets.com/sitemap.xml",
  };
}
