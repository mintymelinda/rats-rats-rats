export function findMatches(message, mappings) {
  const normalizedMessage = message.toLocaleLowerCase("en-US");
  const matches = [];

  mappings.forEach((mapping, mappingIndex) => {
    const { normalizedKeyword } = mapping;
    if (!normalizedKeyword) return;

    let searchFrom = 0;
    while (searchFrom < normalizedMessage.length) {
      const index = normalizedMessage.indexOf(normalizedKeyword, searchFrom);
      if (index === -1) break;

      matches.push({ mapping, index, mappingIndex });
      searchFrom = index + normalizedKeyword.length;
    }
  });

  return matches
    .sort((a, b) => a.index - b.index || a.mappingIndex - b.mappingIndex)
    .map(({ mapping }) => mapping);
}
