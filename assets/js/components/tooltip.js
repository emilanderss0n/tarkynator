export default class Tooltip {
  constructor(container = document.body) {
    this.container = container;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.arrow = document.createElement('div');
    this.arrow.className = 'tooltip-arrow';
    this.tooltip.appendChild(this.arrow);
    document.body.appendChild(this.tooltip);
    this.currentTarget = null;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip], [data-tooltip-html]');
      if (!target || !this.container.contains(target)) return;

      this.currentTarget = target;
      this._show(target);
    });

    this.container.addEventListener('mouseout', (e) => {
      if (
        this.currentTarget &&
        !e.relatedTarget?.closest('[data-tooltip], [data-tooltip-html]')
      ) {
        this._hide();
      }
    });

    window.addEventListener('scroll', () => this._position(), true);
    window.addEventListener('resize', () => this._position());
  }

  _show(el) {
    const html = el.getAttribute('data-tooltip-html');
    const text = el.getAttribute('data-tooltip');
    const direction = el.getAttribute('data-tooltip-position') || 'top';

    this.tooltip.innerHTML = html || text || '';
    this.tooltip.appendChild(this.arrow); // Re-append in case HTML override removed it
    this.tooltip.className = `tooltip visible tooltip-${direction}`;
    this.arrow.className = `tooltip-arrow tooltip-arrow-${direction}`;

    el.classList.forEach(cls => {
      if (cls.startsWith('tooltip-')) {
        this.tooltip.classList.add(cls);
      }
    });

    this._position(direction);
  }

  _hide() {
    this.tooltip.className = 'tooltip';
    this.tooltip.innerHTML = '';
    this.currentTarget = null;
  }

  _position(direction = 'top') {
    if (!this.currentTarget) return;

    const rect = this.currentTarget.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    const tooltipRect = this.tooltip.getBoundingClientRect();
    let top = 0, left = 0;

    switch (direction) {
      case 'bottom':
        top = rect.bottom + scrollY + 8;
        left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = rect.top + scrollY + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left + scrollX - tooltipRect.width - 8;
        break;
      case 'right':
        top = rect.top + scrollY + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + scrollX + 8;
        break;
      case 'top':
      default:
        top = rect.top + scrollY - tooltipRect.height - 8;
        left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
        break;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }
}