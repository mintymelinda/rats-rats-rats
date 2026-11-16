export function findMatches(message, mappings) {
  const normalizedMessage = message.toLocaleLowerCase("en-US");
  return mappings.filter(({ normalizedKeyword }) =>
    normalizedMessage.includes(normalizedKeyword),
  );
}
