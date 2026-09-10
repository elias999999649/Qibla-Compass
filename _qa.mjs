export default async function run(page, ui) {
  const out = {};
  // helper to dispatch a synthetic orientation event into the page
  const fire = async (type, alpha, beta, gamma, absolute) => {
    return page.evaluate(
      ([t, a, b, g, abs]) => {
        const e = new DeviceOrientationEvent(t, {
          alpha: a,
          beta: b,
          gamma: g,
          absolute: abs,
        });
        window.dispatchEvent(e);
        return true;
      },
      [type, alpha, beta, gamma, absolute],
    );
  };

  // Force a known city so we don't depend on GPS: Istanbul -> qibla 151.6
  await page.evaluate(() => {
    setLocation(41.0082, 28.9784, "TEST Istanbul", null);
  });
  out.qibla = await page.evaluate(() => qiblaAngle);

  // --- Test 1: absolute sensor, device top pointing East (alpha=90 => heading 270) ---
  await fire("deviceorientationabsolute", 90, 0, 0, true);
  await page.waitForTimeout(120);
  out.afterAlpha90 = await page.evaluate(() => ({
    heading: currentHeading,
    rose: compassRose.style.transform,
    needle: qiblaNeedle.style.transform,
    headingText: document.getElementById("heading-display").textContent,
    hasSensor,
  }));

  // --- Test 2: turn the phone so top points North (alpha=0 => heading 0) ---
  await fire("deviceorientationabsolute", 0, 0, 0, true);
  await page.waitForTimeout(120);
  out.afterAlpha0 = await page.evaluate(() => ({
    heading: currentHeading,
    needle: qiblaNeedle.style.transform,
    headingText: document.getElementById("heading-display").textContent,
  }));

  // --- Test 3: webkitCompassHeading path (iOS) ---
  await fire("deviceorientation", 0, 0, 0, false);
  await page.evaluate(() => {
    const e = new Event("deviceorientation");
    Object.defineProperty(e, "webkitCompassHeading", {
      value: 45,
      enumerable: true,
    });
    e.beta = 0;
    e.gamma = 0;
    window.dispatchEvent(e);
  });
  await page.waitForTimeout(120);
  out.afterWebkit45 = await page.evaluate(() => ({
    heading: currentHeading,
    needle: qiblaNeedle.style.transform,
    headingText: document.getElementById("heading-display").textContent,
  }));

  return out;
}
