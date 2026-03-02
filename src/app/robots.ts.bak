import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/sitemap'],
        disallow: ['/api/', '/share/', '/admin/'],
      },
    ],
    sitemap: [
      'https://edge.teeco.co/sitemap.xml',
      'https://edge.teeco.co/api/sitemap',
    ],
  };
}
