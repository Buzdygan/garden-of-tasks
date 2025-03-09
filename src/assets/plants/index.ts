// For the prototype, we'll define references to plant sprites
// In a production app, these would be actual image files

interface PlantAsset {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
}

// Plant types - these will be mapped to different task types/categories
export const PLANTS: Record<string, PlantAsset[]> = {
  trees: [
    {
      id: 'oak',
      name: 'Oak Tree',
      imageUrl: 'https://i.imgur.com/wqKBh2k.png', // Placeholder URL
      width: 128,
      height: 256,
    },
    {
      id: 'pine',
      name: 'Pine Tree',
      imageUrl: 'https://i.imgur.com/GJgSxjw.png', // Placeholder URL
      width: 96,
      height: 224,
    },
  ],
  flowers: [
    {
      id: 'rose',
      name: 'Rose',
      imageUrl: 'https://i.imgur.com/cY8sTxK.png', // Placeholder URL
      width: 64,
      height: 96,
    },
    {
      id: 'sunflower',
      name: 'Sunflower',
      imageUrl: 'https://i.imgur.com/tfpDJ1P.png', // Placeholder URL
      width: 64,
      height: 128,
    },
  ],
  bushes: [
    {
      id: 'berry',
      name: 'Berry Bush',
      imageUrl: 'https://i.imgur.com/OZH8Dbm.png', // Placeholder URL
      width: 96,
      height: 96,
    },
  ],
  decorations: [
    {
      id: 'rock',
      name: 'Rock',
      imageUrl: 'https://i.imgur.com/Kb1dnhI.png', // Placeholder URL
      width: 64,
      height: 48,
    },
    {
      id: 'pond',
      name: 'Pond',
      imageUrl: 'https://i.imgur.com/L9Xtlcj.png', // Placeholder URL
      width: 128,
      height: 96,
    },
  ],
};

// Helper function to select a plant based on task properties
export const getPlantForTask = (_task: any): PlantAsset => {
  // For the prototype, we'll randomly select a plant type
  // In a real app, this would use task properties to determine the plant type
  const plantCategories = Object.keys(PLANTS);
  const randomCategory = plantCategories[Math.floor(Math.random() * plantCategories.length)];
  const plantsInCategory = PLANTS[randomCategory];
  return plantsInCategory[Math.floor(Math.random() * plantsInCategory.length)];
}; 