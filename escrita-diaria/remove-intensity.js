// Intensidade removida por decisão de produto. Mantemos apenas Categoria + Desafio.
(function removeIntensity(){
  const remove = () => {
    document.getElementById('intensityPills')?.closest('.field')?.remove();
  };
  remove();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', remove);
  requestAnimationFrame(remove);
})();
