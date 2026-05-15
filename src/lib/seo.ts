export const SITE_URL = 'https://typer.grimm0.dev'
export const SITE_NAME = 'typer.grimm0.dev'
export const SITE_OG_IMAGE = `${SITE_URL}/og.png`

type MetaEntry = Record<string, unknown>
type LinkEntry = Record<string, string>

export type SeoConfig = {
  title: string
  description: string
  path: string
  image?: string
  noindex?: boolean
}

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString()
}

export function buildSeoMeta({ title, description, path, image, noindex }: SeoConfig): MetaEntry[] {
  const url = absoluteUrl(path)
  const ogImage = image ?? SITE_OG_IMAGE

  return [
    { title },
    { name: 'description', content: description },
    ...(noindex ? [{ name: 'robots', content: 'noindex,follow' }] : []),

    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: ogImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },

    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: ogImage },
  ]
}

export function buildCanonicalLink(path: string): LinkEntry {
  return {
    rel: 'canonical',
    href: absoluteUrl(path),
  }
}

export function buildHomeStructuredData(): MetaEntry[] {
  return [
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        description:
          'A code typing game for practicing speed and accuracy with programming snippets.',
      },
    },
  ]
}
