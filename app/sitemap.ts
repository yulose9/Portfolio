import { SITE_INFO } from '@/app/constants/seo';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = SITE_INFO.url;
    const currentDate = new Date().toISOString();

    return [
        {
            url: baseUrl,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/#portfolio`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/#work`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/#about`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/#contact`,
            lastModified: currentDate,
            changeFrequency: 'yearly',
            priority: 0.6,
        },
        // Add blog posts dynamically when you have them
        // {
        //   url: `${baseUrl}/blog/post-slug`,
        //   lastModified: 'YYYY-MM-DD',
        //   changeFrequency: 'never',
        //   priority: 0.5,
        // },
    ];
}
