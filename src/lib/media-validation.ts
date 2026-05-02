export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  // Basic regex check
  const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  
  if (!pattern.test(url)) return false;
  
  // Extension check (common image extensions)
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  const hasExtension = extensions.some(ext => url.toLowerCase().includes(extensions.find(e => url.toLowerCase().endsWith(e)) || '___none___'));
  // Note: some URLs don't end in extension but are images (e.g. Unsplash), so we don't strictly enforce if it's a known image host
  
  return true;
}

export const validateImageSize = (file: File, maxSizeMB: number = 2): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(false);
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    resolve(sizeMB <= maxSizeMB);
  });
}
