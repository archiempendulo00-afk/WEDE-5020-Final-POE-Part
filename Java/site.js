(function(){
  const q = (selector, ctx=document) => ctx.querySelector(selector);
  const qa = (selector, ctx=document) => Array.from(ctx.querySelectorAll(selector));

  function initAccordions(){
    qa('.accordion .accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.parentElement;
        const panel = header.nextElementSibling;
        const isOpen = item.classList.toggle('open');
        panel.style.maxHeight = isOpen ? panel.scrollHeight + 'px' : '0';
      });
    });
  }

  function initTabs(){
    qa('.tabs').forEach(root => {
      const buttons = qa('.tab-buttons button', root);
      const panels = qa('.tab-panel', root);
      buttons.forEach(button => {
        button.addEventListener('click', () => {
          buttons.forEach(btn => btn.classList.toggle('active', btn === button));
          panels.forEach(panel => panel.classList.toggle('active', panel.id === button.dataset.target));
        });
      });
    });
  }

  function initModals(){
    qa('[data-modal-target]').forEach(button => {
      button.addEventListener('click', () => {
        const modal = q('#' + button.dataset.modalTarget);
        openModal(modal);
      });
    });

    qa('.modal .close').forEach(button => {
      button.addEventListener('click', () => {
        closeModal(button.closest('.modal'));
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        qa('.modal.open').forEach(closeModal);
      }
    });

    document.addEventListener('click', event => {
      if (event.target.classList.contains('modal')) {
        closeModal(event.target);
      }
    });
  }

  function openModal(modal){
    if (!modal) return;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeModal(modal){
    if (!modal) return;
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  function initLightbox(){
    qa('.gallery-grid img').forEach(image => {
      image.addEventListener('click', () => {
        openLightbox(image.src, image.alt || 'Gallery image');
      });
    });
  }

  function openLightbox(src, captionText){
    let overlay = q('#lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lightbox-overlay';
      overlay.className = 'modal';
      overlay.innerHTML = '<div class="lightbox-box"><button class="close" aria-label="Close lightbox">×</button><img alt=""><p class="caption"></p></div>';
      document.body.appendChild(overlay);
      q('.lightbox-box .close', overlay).addEventListener('click', () => closeModal(overlay));
    }
    q('img', overlay).src = src;
    q('img', overlay).alt = captionText;
    q('.caption', overlay).textContent = captionText;
    openModal(overlay);
  }

  function initRevealOnScroll(){
    const elements = qa('.reveal-on-scroll');
    if (!elements.length) return;
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    elements.forEach(el => observer.observe(el));
  }

  function loadLeaflet(callback){
    if (window.L) {
      callback();
      return;
    }
    if (!document.querySelector('link[href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = callback;
    document.body.appendChild(script);
  }

  function initMap(){
    const mapElement = q('#map');
    if (!mapElement) return;
    loadLeaflet(() => {
      const map = L.map(mapElement, { scrollWheelZoom: false }).setView([-26.1927, 28.0339], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      L.marker([-26.1927, 28.0339]).addTo(map).bindPopup('Heavenly Bites Bakery<br>Braamfontein, Johannesburg').openPopup();

      const locateButton = q('#locate-btn');
      if (locateButton) {
        locateButton.addEventListener('click', () => {
          if (!navigator.geolocation) {
            alert('Geolocation is not available in your browser.');
            return;
          }
          locateButton.textContent = 'Locating…';
          navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 14);
            L.circle([lat, lng], {
              color: '#d2691e',
              fillColor: '#f4e1d0',
              fillOpacity: 0.8,
              radius: 120
            }).addTo(map).bindPopup('You are here').openPopup();
            locateButton.textContent = 'Find My Location';
            loadNearbyLocations({ lat, lng });
          }, error => {
            alert('Unable to get your location: ' + error.message);
            locateButton.textContent = 'Find My Location';
          });
        });
      }
    });
  }

  function loadNearbyLocations(coordinates){
    const sampleLocations = [
      {
        name: 'Braamfontein Market',
        description: 'Fresh treats, coffee, and quick bites just around the corner.',
        distance: '1.1 km'
      },
      {
        name: 'Jorissen Street Café',
        description: 'A cozy spot for espresso and sweet pastries.',
        distance: '350 m'
      }
    ];
    const list = q('#nearby-list');
    if (!list) return;
    list.innerHTML = '';
    sampleLocations.forEach(location => {
      const card = document.createElement('div');
      card.className = 'location-card';
      card.innerHTML = '<h3>' + location.name + '</h3><p>' + location.description + '</p><p class="muted">' + location.distance + '</p>';
      list.appendChild(card);
    });
  }

  // --- Dynamic products, search and sort ---
  const INLINE_PRODUCTS = [
    {
      "name": "Sourdough Loaf",
      "description": "Handcrafted sourdough with a crisp crust and open crumb.",
      "price": 45.00,
      "tags": ["bread", "artisan", "sourdough"],
      "category": "Breads",
      "id": "sourdough-loaf"
    },
    {
      "name": "Cinnamon Swirl Roll",
      "description": "Buttery roll with cinnamon sugar and cream cheese icing.",
      "price": 18.50,
      "tags": ["pastry", "cinnamon", "sweet"],
      "category": "Pastries",
      "id": "cinnamon-roll"
    },
    {
      "name": "Chocolate Layer Cake",
      "description": "Three-layer chocolate cake with ganache and fresh berries.",
      "price": 650.00,
      "tags": ["cake", "chocolate", "celebration"],
      "category": "Cakes",
      "id": "choc-layer-cake"
    },
    {
      "name": "Chocolate Chip Cookies (6)",
      "description": "Six classic chewy chocolate chip cookies.",
      "price": 39.00,
      "tags": ["cookies", "snack"],
      "category": "Cookies",
      "id": "choc-chip-cookies-6"
    },
    {
      "name": "Almond Croissant",
      "description": "Flaky croissant filled with almond frangipane.",
      "price": 24.00,
      "tags": ["pastry", "almond"],
      "category": "Pastries",
      "id": "almond-croissant"
    }
  ];

  let _allProducts = [];

  async function fetchProducts(){
    try{
      const res = await fetch('Data/products.json');
      if(res.ok) return await res.json();
    }catch(e){
      // silent — will use inline data
    }
    // Fallback to inline products when external JSON is unavailable
    return INLINE_PRODUCTS.slice();
  }

  function renderProductList(items){
    const container = q('#dynamic-products');
    if(!container) return;
    if(!items || items.length===0){
      container.innerHTML = '<p>No products found.</p>';
      return;
    }
    container.innerHTML = items.map(p => `\n      <article class="card product">\n        <h3>${p.name}</h3>\n        <p>${p.description}</p>\n        <p><strong>Price:</strong> R${p.price.toFixed(2)}</p>\n      </article>`).join('\n');
    // re-run accordion/tab init for any new elements if needed
  }

  function initProductSearch(){
    const input = q('#product-search');
    const sort = q('#product-sort');
    if(!input) return;
    function applyFilters(){
      const term = (input.value||'').toLowerCase();
      const sortVal = sort ? sort.value : 'relevance';
      let filtered = _allProducts.filter(p => {
        return p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term) || (p.tags && p.tags.join(' ').toLowerCase().includes(term));
      });
      if(sortVal === 'price-asc') filtered.sort((a,b)=>a.price-b.price);
      if(sortVal === 'price-desc') filtered.sort((a,b)=>b.price-a.price);
      if(sortVal === 'name-asc') filtered.sort((a,b)=>a.name.localeCompare(b.name));
      renderProductList(filtered);
    }
    input.addEventListener('input', applyFilters);
    if(sort) sort.addEventListener('change', applyFilters);
  }

  async function initDynamicProducts(){
    _allProducts = await fetchProducts();
    // render initial grid container; inject container if it doesn't exist
    if(!q('#dynamic-products')){
      const wrapper = document.createElement('div');
      wrapper.id = 'dynamic-products';
      const productsSection = q('#products');
      if(productsSection){
        productsSection.appendChild(wrapper);
      }
    }
    renderProductList(_allProducts);
    initProductSearch();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAccordions();
    initTabs();
    initModals();
    initLightbox();
    initRevealOnScroll();
    initMap();
    initDynamicProducts();
    initForms();
  });

  // --- Forms: validation, AJAX simulation, and enquiry handling ---
  function showFormErrors(container, messages){
    if(!container) return;
    container.innerHTML = '';
    const ul = document.createElement('ul');
    messages.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  function clearFormMessages(...containers){
    containers.forEach(c => { if(c) c.innerHTML = ''; });
  }

  function simulateAjax(url, data){
    return new Promise((resolve) => {
      // Simulate network latency and success
      setTimeout(() => resolve({ ok: true, url, data }), 700);
    });
  }

  async function handleContactSubmit(event){
    event.preventDefault();
    const form = event.target;
    const errorsEl = q('#contact-form-errors');
    const successEl = q('#contact-form-success');
    clearFormMessages(errorsEl, successEl);
    const messages = [];
    if(!form.checkValidity()) messages.push('Please complete the required fields with valid values.');
    const email = q('#contact-email').value.trim();
    const name = q('#contact-name').value.trim();
    const msg = q('#contact-message').value.trim();
    if(email.length && !/^\S+@\S+\.\S+$/.test(email)) messages.push('Enter a valid email address.');
    if(msg.length < 10) messages.push('Message must be at least 10 characters.');
    if(messages.length){
      showFormErrors(errorsEl, messages);
      return;
    }

    const payload = {
      name, email, phone: q('#contact-phone').value.trim(), type: q('#contact-type').value, message: msg
    };

    // Simulate AJAX send
    try{
      const res = await simulateAjax('/api/send-contact', payload);
      if(res.ok){
        successEl.innerHTML = 'Message prepared. <a id="contact-mailto-link">Open email client to send</a>';
        const mailto = `mailto:heavenlyBites47@gmail.com?subject=${encodeURIComponent('Website contact from '+payload.name)}&body=${encodeURIComponent('Type: '+payload.type+'\nPhone: '+payload.phone+'\n\n'+payload.message)}`;
        q('#contact-mailto-link').addEventListener('click', () => { window.location.href = mailto; });
      } else {
        showFormErrors(errorsEl, ['Failed sending message. Please try again later.']);
      }
    }catch(e){
      showFormErrors(errorsEl, ['Network error. Please try again later.']);
    }
  }

  async function handleEnquirySubmit(event){
    event.preventDefault();
    const form = event.target;
    const errorsEl = q('#enquiry-errors');
    const resultEl = q('#enquiry-result');
    clearFormMessages(errorsEl, resultEl);
    const messages = [];
    if(!form.checkValidity()) messages.push('Please complete the required fields.');
    const name = q('#enq-name').value.trim();
    const email = q('#enq-email').value.trim();
    const type = q('#enq-type').value;
    if(email && !/^\S+@\S+\.\S+$/.test(email)) messages.push('Enter a valid email address.');
    if(messages.length){ showFormErrors(errorsEl, messages); return; }

    // If product enquiry, attempt to calculate estimated cost
    if(type === 'product'){
      const productId = q('#enq-product').value;
      const qty = parseInt(q('#enq-quantity').value, 10) || 1;
      let product = null;
      if(_allProducts && _allProducts.length) product = _allProducts.find(p => p.id == productId || p.name == productId);
      if(!product && productId){
        try{ const fetched = await fetch('Data/products.json'); if(fetched.ok) product = (await fetched.json()).find(p=>p.id==productId||p.name==productId); }catch(e){}
        if(!product){
          product = INLINE_PRODUCTS.find(p => p.id == productId || p.name == productId);
        }
      }
      if(product){
        const cost = (product.price || 0) * qty;
        const availability = qty <= 10 ? 'In stock — available for immediate pickup or collection' : 'Large quantity — may require 3–5 business days to prepare';
        resultEl.innerHTML = `Estimated cost: R${cost.toFixed(2)}. ${availability}`;
      } else {
        resultEl.innerHTML = 'We could not find the selected product locally. We will check availability and reply via email.';
      }
      // Simulate sending enquiry data
      await simulateAjax('/api/enquiry', { name, email, type, product: productId, quantity: qty });
      return;
    }

    if(type === 'volunteer'){
      resultEl.innerHTML = 'Thank you for your interest in volunteering. We will review your details and follow up by email.';
      await simulateAjax('/api/enquiry', { name, email, type });
      return;
    }

    if(type === 'sponsor'){
      resultEl.innerHTML = 'Thank you for your interest in sponsorship. A member of our team will contact you with partnership options.';
      await simulateAjax('/api/enquiry', { name, email, type });
      return;
    }

    // Default behavior for other enquiry types
    resultEl.innerHTML = 'Thank you — your enquiry has been noted. We will contact you shortly.';
    await simulateAjax('/api/enquiry', { name, email, type });
  }

  function populateProductSelect(){
    const sel = q('#enq-product');
    if(!sel) return;
    sel.innerHTML = '<option value="">— select product —</option>';
    const list = _allProducts && _allProducts.length ? _allProducts : [];
    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id || p.name;
      opt.textContent = `${p.name} — R${(p.price||0).toFixed(2)}`;
      sel.appendChild(opt);
    });
  }

  function initForms(){
    // Contact form
    const contactForm = q('#contact-form');
    if(contactForm){
      contactForm.addEventListener('submit', handleContactSubmit);
      const resetBtn = q('#contact-reset'); if(resetBtn) resetBtn.addEventListener('click', () => { contactForm.reset(); clearFormMessages(q('#contact-form-errors'), q('#contact-form-success')); });
    }

    // Enquiry form
    const enquiryForm = q('#enquiry-form');
    if(enquiryForm){
      populateProductSelect();
      enquiryForm.addEventListener('submit', handleEnquirySubmit);
      const resetBtn = q('#enq-reset'); if(resetBtn) resetBtn.addEventListener('click', () => { enquiryForm.reset(); clearFormMessages(q('#enquiry-errors'), q('#enquiry-result')); });
      const typeSel = q('#enq-type');
      if(typeSel){
        typeSel.addEventListener('change', (e) => {
          const productRow = q('#product-row');
          const qtyRow = q('#quantity-row');
          if(e.target.value === 'product'){
            if(productRow) productRow.style.display = '';
            if(qtyRow) qtyRow.style.display = '';
          } else {
            if(productRow) productRow.style.display = 'none';
            if(qtyRow) qtyRow.style.display = 'none';
          }
        });
        // initialize visibility
        typeSel.dispatchEvent(new Event('change'));
      }
    }
  }
  

  window.SiteApp = {
    openModal,
    closeModal,
    loadNearbyLocations
  };
})();
