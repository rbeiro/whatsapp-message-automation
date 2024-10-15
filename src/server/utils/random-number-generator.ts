export function generateRandomNumber(min: number, max: number) {
  const randomNum = (Math.random() * (max - min) + 1).toFixed(2);
  return parseFloat(randomNum);
}
