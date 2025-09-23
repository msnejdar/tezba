# 🎨 Design System - Liquid Glass × Porsche Design

## 🏎️ Porsche Design Era (80-90s) Color Palette

### Primary Colors
```css
--porsche-black: #000000
--porsche-dark-grey: #1a1a1a
--porsche-medium-grey: #333333
--porsche-light-grey: #666666
--porsche-silver: #c0c0c0
--porsche-white: #ffffff
```

### Accent Colors
```css
--porsche-orange: #FF6600      /* Hlavní akcentní barva */
--porsche-orange-light: #ff8533
--porsche-orange-dark: #cc5200
--porsche-orange-glow: rgba(255, 102, 0, 0.3)
```

## 💧 Liquid Glass Effects

### Glass Morphism Variables
```css
--glass-bg: rgba(255, 255, 255, 0.1)
--glass-border: rgba(255, 255, 255, 0.2)
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1)
--glass-blur: blur(10px)
--glass-backdrop: saturate(180%) blur(20px)
```

### Premium Glass Effects
```css
.liquid-glass {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.05)
  );
  backdrop-filter: var(--glass-backdrop);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 16px;
}

.glass-surface {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```

## 🖼️ Layout Composition

### 40/60 Split Layout
```css
.app-container {
  display: grid;
  grid-template-columns: 40% 60%;
  height: 100vh;
  gap: 2px;
  background: linear-gradient(135deg, #1a1a1a, #333333);
}

.left-panel {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-backdrop);
  border-right: 1px solid var(--glass-border);
}

.right-panel {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}
```

## 🎯 Typography

### Font Stack
```css
--font-primary: 'Inter', 'SF Pro Display', 'Helvetica Neue', sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;

/* Hierarchy */
--text-xl: 24px;    /* Hlavní nadpisy */
--text-lg: 18px;    /* Sekční nadpisy */
--text-md: 16px;    /* Základní text */
--text-sm: 14px;    /* Pomocný text */
--text-xs: 12px;    /* Metadata */
```

## ✨ Interactive Elements

### Buttons - Porsche Style
```css
.btn-primary {
  background: linear-gradient(135deg, var(--porsche-orange), var(--porsche-orange-dark));
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px var(--porsche-orange-glow);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--porsche-orange-glow);
}

.btn-glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--porsche-silver);
  padding: 10px 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
}
```

### Search Input - Premium Glass
```css
.search-input {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 16px 20px;
  color: white;
  font-size: 16px;
  width: 100%;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: var(--porsche-orange);
  box-shadow: 0 0 20px var(--porsche-orange-glow);
  background: rgba(255, 255, 255, 0.08);
}
```

## 🔍 Search Results Styling

### Result Cards - Glass Morphism
```css
.result-card {
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.02)
  );
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.result-card:hover {
  border-color: var(--porsche-orange);
  transform: translateX(8px);
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.2),
    0 0 15px var(--porsche-orange-glow);
}

.highlight {
  background: var(--porsche-orange);
  color: white;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 102, 0, 0.4);
}
```

## 📱 Responsive Behavior

### Mobile Adaptation
```css
@media (max-width: 768px) {
  .app-container {
    grid-template-columns: 1fr;
    grid-template-rows: 45% 55%;
  }
  
  .left-panel {
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
  }
}
```

## 🌟 Animations & Transitions

### Smooth Interactions
```css
/* Plynulé scrollování */
.scroll-smooth {
  scroll-behavior: smooth;
}

/* Fade-in efekt pro výsledky */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-enter {
  animation: fadeInUp 0.4s ease-out;
}

/* Pulse efekt pro loading */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 1.5s ease-in-out infinite;
}
```

## 🎨 Visual Hierarchy

### Z-Index Layers
```css
--z-background: 0;
--z-content: 10;
--z-glass-surface: 20;
--z-modal: 100;
--z-tooltip: 200;
```

### Spacing System
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

Tento design system kombinuje moderní liquid glass efekty s klasickou Porsche estetikou 80-90 let, vytváří prémiový a technický vzhled s důrazem na funkcionalitu a eleganci.