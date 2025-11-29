<script setup>
  import { computed } from 'vue';
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
  import { Bar } from 'vue-chartjs';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  );

  const props = defineProps({
    labels: { type: Array, required: true },
    // Prefer datasets for multi-series; fall back to single series via `data` props
    datasets: { type: Array, default: () => [] },
    data: { type: Array, default: () => [] },
    datasetLabel: { type: String, default: 'Value' },
    color: { type: String, default: '#466114' },
    height: { type: [Number, String], default: 320 },
    formatTooltip: { type: String, default: 'currency' }, // 'currency' or 'number'
  });

  const getCssVarHslStops = (varToken, chart) => {
    try {
      const varNameMatch = String(varToken).match(/--[a-zA-Z0-9-]+/);
      const varName = varNameMatch ? varNameMatch[0] : null;
      if (!varName) return null;
      const target = chart?.canvas || document.documentElement;
      const rootStyles = getComputedStyle(target);
      const hsl = (rootStyles.getPropertyValue(varName) || '').trim(); // e.g. "142 76% 36%"
      if (!hsl) {
        // Fallback: resolve by applying color to a temp element and reading computed value
        const temp = document.createElement('span');
        temp.style.display = 'none';
        // if token is var(--su) wrap with hsl(); else use as is
        const expr = String(varToken).startsWith('var(')
          ? `hsl(${varToken})`
          : String(varToken);
        temp.style.color = expr;
        (chart?.canvas?.parentNode || document.body).appendChild(temp);
        const rgb = getComputedStyle(temp).color; // rgb(r, g, b)
        temp.remove();
        const match = rgb.match(/rgb\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/i);
        if (!match) return null;
        const [_, r, g, b] = match;
        return [`rgba(${r}, ${g}, ${b}, 0.8)`, `rgba(${r}, ${g}, ${b}, 0.4)`];
      }
      const [h, s, l] = hsl.split(/\s+/);
      const stop1 = `hsla(${h}, ${s}, ${l}, 0.8)`;
      const stop0 = `hsla(${h}, ${s}, ${l}, 0.4)`;
      return [stop1, stop0];
    } catch (_) {
      return null;
    }
  };

  const buildDataset = (label, data, color) => ({
    label,
    data,
    backgroundColor: (ctx) => {
      const { chart } = ctx || {};
      const area = chart?.chartArea;
      const c = color || '#466114';
      if (!area) return c;
      const g = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
      // Support DaisyUI CSS variable tokens like 'var(--su)' or 'hsl(var(--su))'
      let stops = null;
      if (typeof c === 'string' && c.includes('var(--')) {
        stops = getCssVarHslStops(c, chart);
      }
      const stop1 = stops ? stops[0] : c + 'CC';
      const stop0 = stops ? stops[1] : c + '66';
      g.addColorStop(1, stop1);
      g.addColorStop(0, stop0);
      return g;
    },
    borderColor: '#1b2a06',
    borderWidth: 0,
    borderSkipped: false,
    borderRadius: 2,
    maxBarThickness: 48,
  });

  const chartData = computed(() => {
    const ds =
      Array.isArray(props.datasets) && props.datasets.length
        ? props.datasets.map((d) =>
            buildDataset(d.label || 'Value', d.data || [], d.color || '#466114')
          )
        : [buildDataset(props.datasetLabel, props.data, props.color)];
    return { labels: props.labels, datasets: ds };
  });

  // lightweight "elevation" shadow for bars
  const shadowPlugin = {
    id: 'barShadow',
    afterDatasetsDraw(chart, args, pluginOptions) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((bar) => {
          const { x, y, base } = bar.getProps(['x', 'y', 'base'], true);
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          const width = bar.width || 30;
          const left = x - width / 2;
          const top = Math.min(y, base);
          const height = Math.abs(base - y);
          ctx.filter = 'blur(4px)';
          ctx.fillRect(left, top + height - 6, width, 6);
          ctx.restore();
        });
      });
    },
  };

  const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;
  const formatNumber = (n) => Number(n || 0).toLocaleString();

  const options = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx) => {
            const value =
              props.formatTooltip === 'currency'
                ? peso(ctx.parsed.y)
                : props.formatTooltip === 'enhanced-quantity'
                  ? `${formatNumber(ctx.parsed.y)} items sold`
                  : formatNumber(ctx.parsed.y);
            return `${ctx.dataset.label}: ${value}`;
          },
          title: (ctx) => {
            if (props.formatTooltip === 'enhanced-quantity') {
              return `${ctx[0].label}`;
            }
            return ctx[0].label;
          },
        },
      },
      title: { display: false },
    },
    layout: { padding: { top: 8, right: 12, left: 8, bottom: 8 } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          callback: (v) =>
            Number(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v,
          color: '#6b7280',
          font: { size: 11 },
        },
        grid: { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
      },
      x: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }));
</script>

<template>
  <div
    :style="{
      height: typeof height === 'number' ? height + 'px' : String(height),
    }"
  >
    <Bar :data="chartData" :options="options" :plugins="[shadowPlugin]" />
  </div>
</template>

<style scoped></style>
