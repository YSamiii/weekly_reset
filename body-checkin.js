/* Shared, dependency-free body check-in normalization and movement safety rules. */
(function attachBodyCheckin(root) {
  const AREAS = {
    neck: '颈部', shoulder: '肩部', upperBack: '上背部', thoracic: '胸椎／中背部',
    lowBack: '下背部', elbow: '肘部', forearm: '前臂', wrist: '手腕',
    thumb: '拇指', hand: '手部／手指', hip: '髋部', knee: '膝盖',
    ankle: '脚踝', foot: '足弓／前脚掌', abdomen: '腹部／腹压'
  };
  const SYMPTOMS = {
    tight: '酸紧', pain: '疼痛', sharp: '刺痛／灼痛', tingling: '刺麻／麻木',
    weakness: '无力', limited: '活动受限', swelling: '肿胀'
  };
  const TRIGGERS = {
    wristBearing: '手掌撑地／手腕负重', rotation: '转体／旋转', extension: '后弯／深度伸展',
    overhead: '举手过头', gripping: '抓握／反复使用拇指', standing: '站立／行走',
    bending: '弯腰／前屈', lifting: '提举／抱物'
  };
  const AREA_TO_PAIN = {
    neck:'shoulder', shoulder:'shoulder', upperBack:'back', thoracic:'back', lowBack:'back',
    elbow:'wrist', forearm:'wrist', wrist:'wrist', thumb:'wrist', hand:'wrist',
    hip:'hip', knee:'knee', ankle:'foot', foot:'foot', abdomen:'core'
  };
  const LEGACY_TO_AREAS = {
    foot:['foot'], knee:['knee'], back:['lowBack'], shoulder:['shoulder','neck'],
    hip:['hip'], core:['abdomen']
  };
  const VALID_FLAGS = new Set(['chestBreath','rapidNeurology','saddleBladder']);

  function uniqueKnown(values, whitelist) {
    return [...new Set((Array.isArray(values) ? values : []).filter(value => whitelist[value]))];
  }
  function normalize(raw = {}) {
    const oldPains = Array.isArray(raw.pains) ? raw.pains.filter(value => typeof value === 'string') : [];
    const bodyAreas = uniqueKnown(raw.bodyAreas, AREAS);
    const areas = bodyAreas.length ? bodyAreas : [...new Set(oldPains.flatMap(value => LEGACY_TO_AREAS[value] || (AREAS[value] ? [value] : [])))];
    const symptoms = uniqueKnown(raw.symptoms, SYMPTOMS);
    const triggers = uniqueKnown(raw.triggers, TRIGGERS);
    const painKeys = [...new Set([...oldPains, ...areas.map(area => AREA_TO_PAIN[area]).filter(Boolean)])];
    const severity = Math.min(5, Math.max(1, Number(raw.severity) || 2));
    return {
      ...raw,
      pains: painKeys,
      bodyAreas: areas,
      symptoms,
      severity,
      triggers,
      duration: raw.duration === 'ongoing' || raw.persistent ? 'ongoing' : 'today',
      persistent: raw.duration === 'ongoing' || !!raw.persistent,
      knownCondition: ['unsure','suspectedTendon','diagnosedTendon','otherKnown'].includes(raw.knownCondition) ? raw.knownCondition : 'none',
      redFlags: [...new Set((Array.isArray(raw.redFlags) ? raw.redFlags : []).filter(value => VALID_FLAGS.has(value)))]
    };
  }
  function weeklyAreasForAssessment(assessment = {}) {
    const explicit = normalize(assessment.persistentBodyStatus || {}).bodyAreas;
    const covered = new Set(explicit.map(area => AREA_TO_PAIN[area]).filter(Boolean));
    // 老版六类限制仅在没有具体部位覆盖时才展开，防止 shoulder 变成 shoulder + neck。
    const remainingLegacy = (Array.isArray(assessment.pains) ? assessment.pains : [])
      .filter(pain => !covered.has(pain));
    const fallback = normalize({ pains:remainingLegacy }).bodyAreas;
    return [...new Set([...explicit, ...fallback])];
  }

  function merge(...records) {
    const combined = records.map(item => normalize(item || {}));
    const latest = combined[combined.length - 1] || normalize();
    return normalize({
      ...latest,
      bodyAreas: [...new Set(combined.flatMap(item => item.bodyAreas))],
      symptoms: [...new Set(combined.flatMap(item => item.symptoms))],
      triggers: [...new Set(combined.flatMap(item => item.triggers))],
      redFlags: [...new Set(combined.flatMap(item => item.redFlags))],
      pains: [...new Set(combined.flatMap(item => item.pains))],
      severity: Math.max(...combined.map(item => item.severity)),
      duration: combined.some(item => item.duration === 'ongoing') ? 'ongoing' : latest.duration,
      persistent: combined.some(item => item.persistent)
    });
  }
  function requiresRest(body) {
    return normalize(body).redFlags.length > 0;
  }
  function conflictsWithVideo(video = {}, body) {
    const status = normalize(body);
    if (requiresRest(status)) return true;
    const text = [video.title, video.note, video.description, ...(Array.isArray(video.movementTags) ? video.movementTags : [])]
      .filter(Boolean).join(' ').toLowerCase();
    const wristAreas = status.bodyAreas.some(area => ['elbow','forearm','wrist','thumb','hand'].includes(area));
    const wristLoad = wristAreas && status.triggers.includes('wristBearing');
    if (wristLoad && /\b(plank|push[ -]?up|downward dog|down dog|tabletop|quadruped|bear crawl|handstand|wrist[ -]?bearing)\b|俯卧撑|平板支撑|下犬式|四点跪|四足支撑|手腕负重/.test(text)) return true;
    const upperBackAreas = status.bodyAreas.some(area => ['neck','shoulder','upperBack','thoracic'].includes(area));
    if (upperBackAreas && status.triggers.some(trigger => ['rotation','extension'].includes(trigger)) &&
        /\b(deep twist|deep rotation|spinal twist|backbend|wheel pose|cobra pose|upward dog|deep extension)\b|深度扭转|深度旋转|后弯|轮式|眼镜蛇式|上犬式/.test(text)) return true;
    const handUse = wristAreas && status.triggers.includes('gripping');
    if (handUse && /\b(repetitive grip|heavy grip|thumb intensive|wrist weights?)\b|反复抓握|拇指负荷/.test(text)) return true;
    return false;
  }
  function areaSummary(body) {
    return normalize(body).bodyAreas.map(area => AREAS[area]);
  }
  root.DailyBodyCheckin = { AREAS, SYMPTOMS, TRIGGERS, AREA_TO_PAIN, normalize, merge, weeklyAreasForAssessment, requiresRest, conflictsWithVideo, areaSummary };
})(globalThis);

