/** @type {import('next').NextConfig} */
const nextConfig = {
  // Activer la compilation statique
  output: 'export',
  
  // Configurer les en-têtes pour les fichiers statiques
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Configurer les redirections si nécessaire
  async redirects() {
    return [
      {
        source: '/',
        destination: '/index.html',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
