/** Предел роста поля ввода в чатах; дальше — внутренний скролл. */
export const CHAT_TEXTAREA_MAX_H = 120

/**
 * Подгоняет высоту textarea под содержимое — от min-height из его же стилей
 * до `maxPx`, после чего включается внутренний скролл (overflow-y: auto).
 *
 * `height` сбрасывается в 'auto' перед измерением: иначе scrollHeight считается
 * от уже зафиксированной высоты, и поле умеет только расти, но не сжиматься
 * обратно (например после удаления строк или очистки).
 *
 * Вызывать из useLayoutEffect по значению поля, а не из onChange: тогда покрыты
 * и программные изменения текста — очистка после успешной отправки и возврат
 * черновика при ошибке сети, — а не только ввод с клавиатуры. useLayoutEffect,
 * а не useEffect, чтобы браузер не успел отрисовать кадр со старой высотой.
 *
 * Нижнюю границу не считаем: min-height в стилях поля браузер применит сам,
 * даже если сюда придёт меньшее значение.
 */
export function autoGrowTextarea(el: HTMLTextAreaElement | null, maxPx = CHAT_TEXTAREA_MAX_H) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`
}
