import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
  type?: 'website' | 'article' | 'profile';
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function usePageMeta({ title, description, canonicalPath, type = 'website' }: PageMetaOptions) {
  useEffect(() => {
    document.title = title;
    const desc =
      description ||
      'Buy, sell, or rent flats, houses, residential plots, and commercial real estate across India on ZAIDAAT. Hire verified contractors and architects directly.';
    const origin = window.location.origin;
    const canonical = `${origin}${canonicalPath ?? window.location.pathname}`;

    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    upsertCanonical(canonical);
  }, [title, description, canonicalPath, type]);
}
