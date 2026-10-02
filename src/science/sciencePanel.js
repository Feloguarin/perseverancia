import * as THREE from 'three';
import './science.css';
import { REAL_PATCH, REAL_CORE, scoreOf } from './targets.js';

const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
const ACTIONS = [
  { key: 'supercam', kbd: 'Q', short: 'SuperCam', label: 'Analizar a distancia con el láser de SuperCam', busy: 'SuperCam dispara su láser…' },
  { key: 'abrade', kbd: 'E', short: 'Raspar', label: 'Raspar un parche y analizarlo con PIXL y SHERLOC', busy: 'Raspando un parche de 5 cm. PIXL y SHERLOC miden…' },
  { key: 'sample', kbd: 'R', short: 'Muestra', label: 'Perforar y guardar una muestra en un tubo', busy: 'Perforando y sellando el tubo…' },
];
const STATUS = (s) =>
  s.crumbled ? { icon: '○', text: 'Se desmoronó' } : s.sampled ? { icon: '●', text: 'Muestra guardada' } : s.abraded ? { icon: '◐', text: 'Raspada' } : s.analyzed ? { icon: '◔', text: 'Analizada' } : { icon: '·', text: 'Sin estudiar' };
const nameOf = (t, s) => (s.analyzed || s.abraded || s.sampled ? t.name : 'Roca sin estudiar');
const bonusText = (s) => {
  const missing = [!s.analyzed && 'analizarla con SuperCam', !s.abraded && 'rasparla'].filter(Boolean);
  return missing.length ? `Si antes hubieras podido ${missing.join(' y ')}, valdría más.` : 'Incluye el bono por documentarla antes de perforar.';
};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const _v = new THREE.Vector3();

export function createSciencePanel({ targets, state, tubes, onAction, onReport, onRestart }) {
  // Panel de misión.
  const panel = document.createElement('aside');
  panel.className = 'sci';
  panel.setAttribute('aria-label', 'Misión de astrobiología');
  panel.innerHTML = `
    <h2>Misión: ¿hubo vida en Jezero?</h2>
    <p class="sci-goal">Este cráter fue un lago hace 3.500 millones de años. Estudia sus rocas y guarda las mejores muestras.</p>
    <div class="sci-tubes"><div class="sci-tube-row"></div><span class="sci-tube-label"></span></div>
    <ol class="sci-list"></ol>
    <div class="sci-now">
      <p class="sci-near"></p>
      <div class="sci-actions"></div>
      <p class="sci-why" role="status"></p>
      <span class="sci-progress" aria-hidden="true"></span>
    </div>
    <button type="button" class="sci-report-btn">Enviar informe a la Tierra</button>`;
  document.body.append(panel);
  const $ = (sel, root = panel) => root.querySelector(sel);
  const actionsEl = $('.sci-actions');
  const buttons = Object.fromEntries(
    ACTIONS.map((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sci-act';
      b.dataset.action = a.key;
      b.innerHTML = `<kbd>${a.kbd}</kbd><span>${a.short}</span>`;
      b.setAttribute('aria-label', a.label);
      b.addEventListener('click', () => onAction(a.key));
      actionsEl.append(b);
      return [a.key, b];
    }),
  );
  const reportBtn = $('.sci-report-btn');
  reportBtn.addEventListener('click', onReport);

  // Marcadores sobre cada roca objetivo.
  const layer = document.createElement('div');
  layer.className = 'sci-layer';
  document.body.append(layer);
  const markers = targets.map((t) => {
    const el = document.createElement('div');
    el.className = 'sci-marker';
    el.dataset.target = t.key;
    el.innerHTML = '<span class="sci-pin"></span><span class="sci-tag"><b></b><small></small></span>';
    layer.append(el);
    return { t, el };
  });

  // Tarjeta de hallazgo (arriba al centro).
  const card = document.createElement('section');
  card.className = 'sci-find';
  card.setAttribute('role', 'status');
  card.innerHTML = `
    <button type="button" class="sci-close" aria-label="Cerrar">×</button>
    <p class="sci-instr"></p>
    <h3></h3>
    <p class="sci-text"></p>
    <p class="sci-hint"></p>
    <figure class="sci-photo"><img alt="" /><figcaption></figcaption></figure>`;
  document.body.append(card);
  $('.sci-close', card).addEventListener('click', () => card.classList.remove('is-open'));

  // Informe final.
  const report = document.createElement('div');
  report.className = 'sci-report';
  report.innerHTML = `
    <div class="sci-report-card" role="dialog" aria-modal="true" aria-label="Informe para la Tierra">
      <p class="sci-instr">Informe para la Tierra</p>
      <h3 class="sci-score"></h3>
      <p class="sci-rank"></p>
      <ol class="sci-samples"></ol>
      <p class="sci-why-text">Tus tubos esperan dentro del rover a una futura misión que los traiga a la Tierra. Allá, laboratorios mucho más potentes podrán responder la gran pregunta: ¿hubo vida en Marte? El rover real ya guardó más de 25 muestras.</p>
      <div class="sci-report-actions">
        <button type="button" class="sci-keep">Seguir explorando</button>
        <button type="button" class="sci-restart">Empezar de nuevo</button>
      </div>
    </div>`;
  document.body.append(report);
  $('.sci-keep', report).addEventListener('click', () => report.classList.remove('is-open'));
  $('.sci-restart', report).addEventListener('click', onRestart);

  // Teclas Q, E, R (no cuando hay una foto abierta) y T para ocultar el panel.
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.target.closest?.('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 't') {
      panel.classList.toggle('is-hidden');
      card.classList.remove('is-open');
      return;
    }
    if (report.classList.contains('is-open')) {
      if (k === 'escape') report.classList.remove('is-open');
      return;
    }
    const a = ACTIONS.find((x) => x.kbd.toLowerCase() === k);
    if (a) onAction(a.key);
  });

  function renderList() {
    const used = state.tubes.length;
    $('.sci-tube-row').innerHTML = Array.from({ length: tubes }, (_, i) => {
      const key = state.tubes[i];
      const crumbled = key && state.targets[key].crumbled;
      return `<span class="sci-tube${key ? ' is-full' : ''}${crumbled ? ' is-air' : ''}" title="${key ? targets.find((t) => t.key === key).name : 'Tubo libre'}"></span>`;
    }).join('');
    $('.sci-tube-label').textContent = `${tubes - used} de ${tubes} tubos libres`;
    $('.sci-list').innerHTML = targets
      .map((t) => {
        const s = state.targets[t.key];
        const st = STATUS(s);
        return `<li data-target="${t.key}" data-status="${st.text}"><span class="sci-icon" aria-hidden="true">${st.icon}</span><span>${nameOf(t, s)}</span><small>${st.text}</small></li>`;
      })
      .join('');
    panel.dataset.tubesUsed = String(used);
  }
  renderList();

  let lastRender = 0;
  return {
    update({ options, camera, rover, busy, now, durations }) {
      // Marcadores: sobre la roca, o en el borde de la pantalla si está fuera de vista.
      const w = innerWidth, h = innerHeight, pad = 28;
      for (const { t, el } of markers) {
        const s = state.targets[t.key];
        _v.set(t.x, t.mesh.position.y + t.mesh.scale.y * 1.6 + 0.4, t.z).project(camera);
        const behind = _v.z > 1;
        let x = ((_v.x + 1) / 2) * w, y = ((1 - _v.y) / 2) * h;
        if (behind) (x = w - x), (y = pad + 60);
        const off = behind || x < pad || x > w - pad || y < pad || y > h - pad;
        x = THREE.MathUtils.clamp(x, pad, w - pad);
        y = THREE.MathUtils.clamp(y, pad, h - pad);
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.classList.toggle('is-off', off);
        el.classList.toggle('is-done', Boolean(s.sampled));
        const near = options?.target === t;
        el.classList.toggle('is-near', near);
        el.querySelector('b').textContent = nameOf(t, s);
        const p = rover.object.position;
        const dist = Math.max(0, Math.hypot(t.x - p.x, t.z - p.z) - t.radius);
        el.querySelector('small').textContent = s.sampled ? STATUS(s).text : `${nf0.format(dist)} m`;
      }

      if (now - lastRender < 120) return;
      lastRender = now;
      const progress = $('.sci-progress');
      if (busy) {
        progress.style.transform = `scaleX(${Math.min(1, (now - busy.start) / durations[busy.action])})`;
        return;
      }
      progress.style.transform = 'scaleX(0)';
      if (!options) return;
      const t = options.target;
      const s = state.targets[t.key];
      $('.sci-near').innerHTML = `Más cerca: <b>${nameOf(t, s)}</b>, a ${nf0.format(options.dist)} m`;
      let firstWhy = '';
      for (const a of ACTIONS) {
        const why = options[a.key];
        buttons[a.key].disabled = why !== null;
        buttons[a.key].title = why ? `${a.label}: ${why.toLowerCase()}` : a.label;
        if (why && !firstWhy && !(why.startsWith('Ya'))) firstWhy = why;
      }
      $('.sci-why').textContent = firstWhy;
      reportBtn.disabled = state.tubes.length === 0;
      reportBtn.title = reportBtn.disabled ? 'Guarda al menos una muestra para enviar el informe' : '';
      panel.dataset.near = t.key;
    },

    setBusy(action, t) {
      for (const b of Object.values(buttons)) b.disabled = true;
      $('.sci-why').textContent = ACTIONS.find((a) => a.key === action).busy;
      panel.dataset.busy = action;
    },

    showFinding(f, st) {
      delete panel.dataset.busy;
      renderList();
      const t = f.target;
      const s = st.targets[t.key];
      const photo = $('.sci-photo', card);
      card.classList.remove('is-bio');
      photo.hidden = true;
      if (f.kind === 'supercam') {
        $('.sci-instr', card).textContent = 'SuperCam · análisis a distancia';
        $('h3', card).textContent = `${t.name}: ${t.supercam.type}`;
        $('.sci-text', card).textContent = t.supercam.text;
        $('.sci-hint', card).textContent = `${t.where}. El láser principal de SuperCam es infrarrojo, invisible a nuestros ojos: aquí lo dibujamos para verlo.`;
      } else if (f.kind === 'abrade') {
        $('.sci-instr', card).textContent = 'Raspado + PIXL + SHERLOC · análisis de contacto';
        $('h3', card).textContent = t.biosignature ? `${t.name}: posible biofirma` : `${t.name}: qué hay dentro`;
        $('.sci-text', card).textContent = t.contact.text;
        $('.sci-hint', card).textContent = t.contact.hint;
        card.classList.toggle('is-bio', Boolean(t.biosignature));
        photo.hidden = false;
        $('img', photo).src = REAL_PATCH.url;
        $('figcaption', photo).textContent = REAL_PATCH.caption;
      } else {
        $('.sci-instr', card).textContent = s.crumbled ? 'Muestra fallida' : `Tubo ${st.tubes.length} de ${tubes} sellado`;
        $('h3', card).textContent = s.crumbled ? `${t.name}: se hizo polvo` : `${t.name}: muestra guardada`;
        $('.sci-text', card).textContent = t.sample.text;
        $('.sci-hint', card).textContent = s.crumbled
          ? 'Aprendizaje real: después de Roubion, el equipo buscó rocas más firmes para perforar.'
          : `Vale ${scoreOf(t, s)} puntos. ${bonusText(s)}`;
        if (!s.crumbled) {
          photo.hidden = false;
          $('img', photo).src = REAL_CORE.url;
          $('figcaption', photo).textContent = REAL_CORE.caption;
        }
      }
      card.dataset.kind = f.kind;
      card.dataset.target = t.key;
      card.classList.add('is-open');
      if (!reducedMotion()) card.animate([{ opacity: 0, translate: '0 -8px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'ease-out' });
    },

    showReport({ samples, score, max }) {
      card.classList.remove('is-open');
      $('.sci-score', report).textContent = `${nf0.format(score)} de ${nf0.format(max)} puntos`;
      const ratio = score / max;
      $('.sci-rank', report).textContent =
        ratio >= 0.95 ? 'Misión perfecta: escogiste justo las rocas que el equipo real considera más valiosas.' : ratio >= 0.7 ? 'Ciencia de primer nivel. Revisa si alguna roca merecía más estudio antes de perforar.' : ratio >= 0.35 ? 'Buen comienzo. Analiza antes de perforar: así se decide qué vale un tubo.' : 'Primer sol en Jezero. Usa SuperCam y el raspado para saber qué guarda cada roca.';
      $('.sci-samples', report).innerHTML = samples.length
        ? samples.map((x) => `<li><b>${x.target.name}</b><span>${x.state.crumbled ? 'Solo aire de Marte' : x.target.where}</span><em>${x.points} pts</em></li>`).join('')
        : '<li><span>Todavía no guardaste ninguna muestra.</span></li>';
      report.dataset.score = String(score);
      report.classList.add('is-open');
      renderList();
    },
  };
}
