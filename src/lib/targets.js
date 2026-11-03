// Tính nhu cầu năng lượng và macro mỗi ngày.
//
// 1) BMR (năng lượng cơ thể đốt khi nằm yên) theo công thức Mifflin–St Jeor:
//      nam: 10·cân nặng + 6.25·chiều cao − 5·tuổi + 5
//      nữ : 10·cân nặng + 6.25·chiều cao − 5·tuổi − 161
// 2) TDEE = BMR × hệ số vận động.
// 3) Điều chỉnh theo mục tiêu: giảm mỡ −20 %, giữ cân 0 %, tăng cơ +10 %.
// 4) Chia macro: đạm theo g/kg cân nặng, chất béo ~25 % năng lượng,
//    phần còn lại là tinh bột. (1 g đạm = 4 kcal, 1 g tinh bột = 4 kcal, 1 g béo = 9 kcal.)

export const ACTIVITY_LEVELS = {
  sedentary: { factor: 1.2, label: 'Ít vận động (ngồi văn phòng, không tập)' },
  light: { factor: 1.375, label: 'Nhẹ (tập 1–3 buổi/tuần)' },
  moderate: { factor: 1.55, label: 'Vừa (tập 3–5 buổi/tuần)' },
  active: { factor: 1.725, label: 'Nhiều (tập 6–7 buổi/tuần)' },
  athlete: { factor: 1.9, label: 'Rất nhiều (tập 2 lần/ngày, lao động nặng)' },
};

export const GOALS = {
  cut: { kcalFactor: 0.8, proteinPerKg: 2.2, label: 'Giảm mỡ' },
  maintain: { kcalFactor: 1.0, proteinPerKg: 1.8, label: 'Giữ cân, săn chắc' },
  bulk: { kcalFactor: 1.1, proteinPerKg: 2.0, label: 'Tăng cơ' },
};

export const DEFAULT_PROFILE = {
  sex: 'male',
  age: 25,
  heightCm: 170,
  weightKg: 65,
  activity: 'moderate',
  goal: 'maintain',
};

export function calcTargets(profile) {
  const { sex, age, heightCm, weightKg } = profile;
  const activity = ACTIVITY_LEVELS[profile.activity] ?? ACTIVITY_LEVELS.moderate;
  const goal = GOALS[profile.goal] ?? GOALS.maintain;

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
  const tdee = bmr * activity.factor;
  const kcal = tdee * goal.kcalFactor;

  const p = goal.proteinPerKg * weightKg;
  // Chất béo: 25 % năng lượng nhưng không dưới 0.6 g/kg (cần cho nội tiết tố).
  const f = Math.max((kcal * 0.25) / 9, 0.6 * weightKg);
  const c = Math.max((kcal - p * 4 - f * 9) / 4, 0);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal),
    p: Math.round(p),
    c: Math.round(c),
    f: Math.round(f),
  };
}
