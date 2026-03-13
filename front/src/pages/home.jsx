import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="container section">
      <div className="hero-panel">
        <div>
          <p className="hero-tag">Trending Handloom Collection</p>
          <h2>Style Meets Tradition</h2>
          <p>
            Discover curated handloom fashion inspired by India&apos;s weaving heritage with
            trusted quality and fast delivery.
          </p>
          <Link to="/products" className="button-link">
            Shop Now
          </Link>
        </div>
      </div>

      <div className="home-categories">
        <article className="quick-card">
          <h3>Women&apos;s Wear</h3>
          <p>Sarees, kurtas and festive essentials at great prices.</p>
        </article>
        <article className="quick-card">
          <h3>Men&apos;s Collection</h3>
          <p>Shirts, kurtas and ethnic styles for everyday comfort.</p>
        </article>
        <article className="quick-card">
          <h3>Home Textiles</h3>
          <p>Premium handloom bedsheets, table linen and décor picks.</p>
        </article>
        <article className="quick-card">
          <h3>New Arrivals</h3>
          <p>Fresh drops from artisan clusters across the country.</p>
        </article>
      </div>
    </section>
  )
}
