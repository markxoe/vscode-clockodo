/**
 * Convert a number of seconds to a string in the format hh:mm:ss
 * @param seconds the number of seconds
 * @returns hh:mm:ss formatted string
 */
export const secondsToHHMMSS = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let out = "";
  if (hours > 0) {
    out += `${hours.toString().padStart(2, "0")}:`;
  }

  out += `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;

  return out;
};

/**
 * Try to parse hh:mm:ss to seconds
 * @param input the input string
 * @returns the seconds or NaN
 */
export const tryHHMMSSToSeconds = (input: string) => {
  const parts = input.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return (
      parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
    );
  }

  return NaN;
};

export const toIso8601 = (date: Date) => {
  return date.toISOString().replace(/\.\d{3}/, "");
};
