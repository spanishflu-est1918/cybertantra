export async function getUserCity(): Promise<string> {
  try {
    
    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js)',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      return 'UNKNOWN';
    }
    
    const data = await response.json();
    
    return data.city ? data.city.toUpperCase() : 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}