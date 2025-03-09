import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

interface GardenProps {
  tasks: any[];
}

interface PlantInstance {
  id: string;
  x: number;
  y: number;
  sprite: PIXI.Sprite;
  task: any;
}

// Garden view state interface
interface ViewState {
  x: number;
  y: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  lastPositionX: number;
  lastPositionY: number;
  zoom: number; // Add zoom level to view state
}

// Compatibility helpers for PixiJS v7 and v8
const isV8 = () => {
  // Check for v8 specific methods
  return typeof PIXI.Graphics.prototype.fill === 'function';
};

// Helper function to draw a rectangle that works in both PixiJS v7 and v8
const drawRect = (graphics: PIXI.Graphics, x: number, y: number, width: number, height: number) => {
  if (isV8()) {
    graphics.rect(x, y, width, height);
  } else {
    (graphics as any).drawRect(x, y, width, height);
  }
};

// Helper for fill operations
const setFillStyle = (graphics: PIXI.Graphics, color: number, alpha: number = 1) => {
  if (isV8()) {
    graphics.fill({ color, alpha });
  } else {
    graphics.beginFill(color, alpha);
  }
};

// Helper for line/stroke operations
const setStrokeStyle = (graphics: PIXI.Graphics, width: number, color: number, alpha: number = 1) => {
  if (isV8()) {
    graphics.setStrokeStyle({ width, color, alpha });
  } else {
    graphics.lineStyle(width, color, alpha);
  }
};

// Helper for ending fill (only needed in v7)
const endFill = (graphics: PIXI.Graphics) => {
  if (!isV8()) {
    graphics.endFill();
  }
  // In v8, endFill is not needed
};

// Helper for adding a child to a display object
const _addChild = (parent: any, child: any) => {
  if (parent instanceof PIXI.Container) {
    parent.addChild(child);
  } else {
    // For v8, create a container if the parent is not one
    console.warn('In PixiJS v8, only Containers can have children');
    // As a fallback, try to add anyway for backward compatibility
    (parent as any).addChild?.(child);
  }
};

// Helper function to get the canvas from the application
const getCanvas = (app: PIXI.Application): HTMLCanvasElement | null => {
  if (!app) return null;
  
  try {
    // For v8
    if (isV8() && app.renderer) {
      return (app.renderer as any).canvas;
    }
    
    // For v7
    return app.view as HTMLCanvasElement;
  } catch (e) {
    console.warn('Could not get canvas from application', e);
    return null;
  }
};

// Create a monkeyPatch for app.view to avoid deprecation warnings in v8
const monkeyPatchAppView = (app: PIXI.Application) => {
  if (isV8() && app.renderer) {
    // Define a getter that redirects to canvas in v8
    Object.defineProperty(app, 'view', {
      get: function() {
        return (app.renderer as any).canvas;
      },
      configurable: true
    });
  }
};

// Color palettes for different plant types
const COLOR_PALETTES = {
  tree: {
    trunk: [0x8B4513, 0x6B4226, 0x5D4037, 0x4E342E, 0x795548],
    leaves: [0x4CAF50, 0x388E3C, 0x2E7D32, 0x1B5E20, 0x43A047]
  },
  flower: {
    stem: [0x33691E, 0x558B2F, 0x689F38, 0x7CB342, 0x8BC34A],
    petals: [0xE91E63, 0xD81B60, 0xEC407A, 0xF06292, 0xF8BBD0, 0xFF4081, 0xF50057]
  },
  bush: {
    main: [0x388E3C, 0x2E7D32, 0x1B5E20, 0x66BB6A, 0x4CAF50]
  },
  cactus: {
    main: [0x2E8B57, 0x3CB371, 0x00695C, 0x00796B, 0x00897B],
    flower: [0xFFC107, 0xFFD54F, 0xFFE082]
  },
  grass: {
    blades: [0x7CB342, 0x689F38, 0x558B2F, 0x4CAF50, 0x43A047]
  },
  mushroom: {
    stem: [0xECEFF1, 0xCFD8DC, 0xB0BEC5],
    cap: [0xEF5350, 0xF44336, 0xD32F2F, 0xC62828, 0xB71C1C]
  },
  rock: {
    main: [0x9E9E9E, 0x757575, 0x616161, 0x424242, 0x607D8B, 0x546E7A]
  }
};

// Random helpers
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = <T extends any>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const randomVariation = (base: number, variance: number) => base + (Math.random() * variance * 2) - variance;

// Advanced plant shape drawing functions
const plantDrawingFunctions = {
  // Oak or maple tree
  tree: (graphics: PIXI.Graphics, size: number) => {
    const trunkColor = randomChoice(COLOR_PALETTES.tree.trunk);
    const leavesColor = randomChoice(COLOR_PALETTES.tree.leaves);
    const trunkWidth = size * 0.15;
    const trunkHeight = size * 0.7;
    const leavesRadius = size * 0.4;
    
    // Trunk
    setFillStyle(graphics, trunkColor);
    setStrokeStyle(graphics, 2, 0x33220D, 0.8);
    drawRect(graphics, -trunkWidth/2, -trunkHeight, trunkWidth, trunkHeight);
    endFill(graphics);
    
    // Leaves - Draw multiple circles for a more natural look
    setFillStyle(graphics, leavesColor);
    setStrokeStyle(graphics, 2, 0x005600, 0.5);
    
    // Base leaf clump
    graphics.drawCircle(0, -trunkHeight - leavesRadius/2, leavesRadius);
    
    // Additional leaf clumps for natural look
    const leafClusters = randomInt(3, 5);
    for (let i = 0; i < leafClusters; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = leavesRadius * 0.5;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance - trunkHeight - leavesRadius/2;
      const clusterSize = leavesRadius * (0.6 + Math.random() * 0.4);
      
      graphics.drawCircle(x, y, clusterSize);
    }
    
    endFill(graphics);
  },
  
  // Beautiful flower
  flower: (graphics: PIXI.Graphics, size: number) => {
    const stemColor = randomChoice(COLOR_PALETTES.flower.stem);
    const petalColor = randomChoice(COLOR_PALETTES.flower.petals);
    const stemWidth = size * 0.07;
    const stemHeight = size * 0.6;
    const flowerSize = size * 0.25;
    
    // Stem
    setFillStyle(graphics, stemColor);
    setStrokeStyle(graphics, 2, 0x1B5E20, 0.7);
    drawRect(graphics, -stemWidth/2, -stemHeight, stemWidth, stemHeight);
    
    // Random leaves on the stem
    const leaves = randomInt(1, 2);
    for (let i = 0; i < leaves; i++) {
      const leafSize = size * 0.15;
      const leafY = -stemHeight * (0.3 + i * 0.3);
      const leafDirection = i % 2 === 0 ? 1 : -1;
      
      graphics.moveTo(0, leafY);
      graphics.bezierCurveTo(
        leafDirection * leafSize * 0.5, leafY - leafSize * 0.2,
        leafDirection * leafSize, leafY - leafSize * 0.4,
        leafDirection * leafSize, leafY - leafSize * 0.8
      );
      graphics.bezierCurveTo(
        leafDirection * leafSize * 0.8, leafY - leafSize,
        leafDirection * leafSize * 0.5, leafY - leafSize * 0.8,
        0, leafY
      );
    }
    
    endFill(graphics);
    
    // Petals - Using bezier curves for more natural flower shape
    setFillStyle(graphics, petalColor);
    setStrokeStyle(graphics, 2, 0xC2185B, 0.7);
    
    const petalCount = randomInt(5, 8);
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const x = Math.cos(angle) * flowerSize;
      const y = Math.sin(angle) * flowerSize - stemHeight - flowerSize;
      
      // Draw petal
      graphics.moveTo(0, -stemHeight - flowerSize/4);
      graphics.bezierCurveTo(
        x * 0.5, y - flowerSize * 0.1,
        x * 0.8, y,
        x, y
      );
      graphics.bezierCurveTo(
        x * 0.8, y + flowerSize * 0.2,
        x * 0.5, y + flowerSize * 0.3,
        0, -stemHeight - flowerSize/4
      );
    }
    
    // Flower center
    setFillStyle(graphics, 0xFFEB3B);
    graphics.drawCircle(0, -stemHeight - flowerSize/4, flowerSize/4);
    
    endFill(graphics);
  },
  
  // Rounded bush or shrub
  bush: (graphics: PIXI.Graphics, size: number) => {
    const bushColor = randomChoice(COLOR_PALETTES.bush.main);
    const bushWidth = size * 0.8;
    const bushHeight = size * 0.7;
    
    setFillStyle(graphics, bushColor);
    setStrokeStyle(graphics, 2, 0x1B5E20, 0.7);
    
    // Main bush body as an ellipse
    graphics.drawEllipse(0, -bushHeight/2, bushWidth/2, bushHeight/2);
    
    // Add some variation with overlapping circles
    const clumps = randomInt(3, 5);
    for (let i = 0; i < clumps; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = bushWidth * 0.25;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance - bushHeight/2;
      const clumpSize = bushWidth * (0.2 + Math.random() * 0.2);
      
      graphics.drawCircle(x, y, clumpSize);
    }
    
    endFill(graphics);
  },
  
  // Cactus with segments
  cactus: (graphics: PIXI.Graphics, size: number) => {
    const cactusColor = randomChoice(COLOR_PALETTES.cactus.main);
    const flowerColor = randomChoice(COLOR_PALETTES.cactus.flower);
    
    const mainWidth = size * 0.25;
    const mainHeight = size * 0.8;
    
    // Main cactus body
    setFillStyle(graphics, cactusColor);
    setStrokeStyle(graphics, 2, 0x00695C, 0.8);
    
    // Rounded rectangle for the main stem
    graphics.drawRoundedRect(-mainWidth/2, -mainHeight, mainWidth, mainHeight, mainWidth * 0.2);
    
    // Add some arms
    const hasLeftArm = Math.random() > 0.3;
    const hasRightArm = Math.random() > 0.3;
    
    if (hasLeftArm) {
      const armHeight = mainHeight * (0.3 + Math.random() * 0.3);
      const armWidth = mainWidth * 0.8;
      const armY = -mainHeight * (0.4 + Math.random() * 0.3);
      
      graphics.drawRoundedRect(-mainWidth/2 - armWidth, armY, armWidth, armHeight, armWidth * 0.2);
    }
    
    if (hasRightArm) {
      const armHeight = mainHeight * (0.3 + Math.random() * 0.3);
      const armWidth = mainWidth * 0.8;
      const armY = -mainHeight * (0.4 + Math.random() * 0.3);
      
      graphics.drawRoundedRect(mainWidth/2, armY, armWidth, armHeight, armWidth * 0.2);
    }
    
    // Add cactus spines
    setStrokeStyle(graphics, 1, 0xEEEEEE);
    
    const spineCount = randomInt(8, 15);
    for (let i = 0; i < spineCount; i++) {
      const spineY = -mainHeight * (0.1 + (i / spineCount) * 0.8);
      
      // Left side spines
      graphics.moveTo(-mainWidth/2, spineY);
      graphics.lineTo(-mainWidth/2 - size * 0.08, spineY + size * 0.02);
      
      // Right side spines
      graphics.moveTo(mainWidth/2, spineY);
      graphics.lineTo(mainWidth/2 + size * 0.08, spineY + size * 0.02);
    }
    
    // Add flowers on top (sometimes)
    if (Math.random() > 0.5) {
      const flowerCount = randomInt(1, 3);
      setFillStyle(graphics, flowerColor);
      
      for (let i = 0; i < flowerCount; i++) {
        const flowerX = randomVariation(0, mainWidth/2);
        const flowerSize = mainWidth * (0.3 + Math.random() * 0.2);
        graphics.drawCircle(flowerX, -mainHeight - flowerSize/2, flowerSize);
      }
    }
    
    endFill(graphics);
  },
  
  // Tall grass
  grass: (graphics: PIXI.Graphics, size: number) => {
    const grassColor = randomChoice(COLOR_PALETTES.grass.blades);
    setFillStyle(graphics, grassColor, 0); // No fill
    setStrokeStyle(graphics, 2, grassColor);
    
    const bladeCount = randomInt(6, 10);
    const maxHeight = size * 0.7;
    
    // Draw individual blades of grass
    for (let i = 0; i < bladeCount; i++) {
      const bladeX = randomVariation(0, size * 0.3);
      const bladeHeight = randomVariation(maxHeight, maxHeight * 0.2);
      const controlX = bladeX + randomVariation(0, size * 0.2);
      
      graphics.moveTo(bladeX, 0);
      graphics.quadraticCurveTo(
        controlX, -bladeHeight * 0.7,
        bladeX + randomVariation(0, size * 0.1), -bladeHeight
      );
    }
    
    endFill(graphics);
  },
  
  // Cute mushroom
  mushroom: (graphics: PIXI.Graphics, size: number) => {
    const stemColor = randomChoice(COLOR_PALETTES.mushroom.stem);
    const capColor = randomChoice(COLOR_PALETTES.mushroom.cap);
    
    const stemWidth = size * 0.2;
    const stemHeight = size * 0.6;
    const capWidth = size * 0.5;
    const capHeight = size * 0.3;
    
    // Stem
    setFillStyle(graphics, stemColor);
    setStrokeStyle(graphics, 2, 0xAAAAAA, 0.8);
    graphics.drawRoundedRect(-stemWidth/2, -stemHeight, stemWidth, stemHeight, stemWidth * 0.2);
    
    // Cap
    setFillStyle(graphics, capColor);
    setStrokeStyle(graphics, 2, 0xAA3333, 0.8);
    
    graphics.moveTo(-capWidth, -stemHeight);
    graphics.quadraticCurveTo(
      0, -stemHeight - capHeight * 2,
      capWidth, -stemHeight
    );
    graphics.lineTo(-capWidth, -stemHeight);
    
    // Spots on the mushroom cap (for Amanita-like mushrooms)
    if (Math.random() > 0.5) {
      setFillStyle(graphics, 0xFFFFFF);
      
      const spotCount = randomInt(3, 7);
      for (let i = 0; i < spotCount; i++) {
        const spotX = randomVariation(0, capWidth * 0.6) * (Math.random() > 0.5 ? 1 : -1);
        const spotY = -stemHeight - capHeight * (0.5 + Math.random() * 0.5);
        const spotSize = capWidth * (0.05 + Math.random() * 0.05);
        
        graphics.drawCircle(spotX, spotY, spotSize);
      }
    }
    
    endFill(graphics);
  },
  
  // Rock or stone
  rock: (graphics: PIXI.Graphics, size: number) => {
    const rockColor = randomChoice(COLOR_PALETTES.rock.main);
    const rockSize = size * 0.5;
    
    setFillStyle(graphics, rockColor);
    setStrokeStyle(graphics, 2, 0x424242, 0.8);
    
    // Create a jagged rock shape using a polygon
    const points = [];
    const segments = randomInt(6, 10);
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const radius = rockSize * (0.8 + Math.random() * 0.4);
      
      points.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius - rockSize * 0.5
      );
    }
    
    graphics.drawPolygon(points);
    
    // Add some texture lines to the rock
    setStrokeStyle(graphics, 1, 0x616161, 0.5);
    
    const lineCount = randomInt(2, 4);
    for (let i = 0; i < lineCount; i++) {
      const y = -rockSize * (0.2 + 0.6 * (i / lineCount));
      const xOffset = rockSize * (0.2 + Math.random() * 0.4);
      
      graphics.moveTo(-xOffset, y);
      graphics.lineTo(xOffset, y + rockSize * (Math.random() * 0.2 - 0.1));
    }
    
    endFill(graphics);
  }
};

// Garden Controls Component to help users navigate
const GardenControls: React.FC<{ onReset: () => void, totalPlants: number, zoom: number, onZoomIn: () => void, onZoomOut: () => void, onResetZoom: () => void }> = ({ onReset, totalPlants, zoom, onZoomIn, onZoomOut, onResetZoom }) => {
  return (
    <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-md flex flex-col gap-2 max-w-xs">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Garden Stats</div>
        <div className="text-xs text-gray-500">Plants: {totalPlants}</div>
      </div>
      
      <div className="text-xs text-gray-600 mt-1">
        <p className="font-medium mb-1">Navigation:</p>
        <p>• Drag with mouse to pan</p>
        <p>• Use arrow keys to move</p>
        <p>• Press Home to center</p>
      </div>
      
      <div className="text-xs text-gray-600 mt-1">
        <p className="font-medium mb-1">Zoom:</p>
        <p>{zoom.toFixed(2)}</p>
      </div>
      
      <button 
        onClick={onReset}
        className="mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
      >
        Reset View
      </button>
      
      <button 
        onClick={onZoomIn}
        className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
      >
        Zoom In
      </button>
      
      <button 
        onClick={onZoomOut}
        className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
      >
        Zoom Out
      </button>
      
      <button 
        onClick={onResetZoom}
        className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
      >
        Reset Zoom
      </button>
    </div>
  );
};

const Garden: React.FC<GardenProps> = ({ tasks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const plantsRef = useRef<PlantInstance[]>([]);
  const [hoveredTask, setHoveredTask] = useState<any | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  // Garden view state for panning and navigation
  const viewStateRef = useRef<ViewState>({
    x: 0,
    y: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastPositionX: 0,
    lastPositionY: 0,
    zoom: 1.0 // Default zoom level is 1.0 (100%)
  });
  
  // Track the current zoom level in state for UI updates
  const [currentZoom, setCurrentZoom] = useState<number>(1.0);

  // Min and max zoom levels
  const MIN_ZOOM = 0.5;  // 50%
  const MAX_ZOOM = 2.0;  // 200%
  const ZOOM_STEP = 0.1; // 10% per zoom step

  // Debugging - log tasks when they change
  useEffect(() => {
    console.log('Tasks received by Garden component:', tasks);
  }, [tasks]);

  // Initialize PixiJS application
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing PixiJS garden with', tasks.length, 'tasks');

    // Create a variable to store our reference to the application for cleanup
    let localApp: PIXI.Application | null = null;

    try {
      // First, create a canvas element manually
      const canvas = document.createElement('canvas');
      canvas.width = containerRef.current.clientWidth || 800;
      canvas.height = containerRef.current.clientHeight || 600;
      
      // Clear the container
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      // Append the canvas to the container
      containerRef.current.appendChild(canvas);
      
      // Create a new PIXI Application using the modern API
      let app: PIXI.Application;
      
      try {
        // Try modern PixiJS v8+ initialization
        app = new PIXI.Application();
        
        // Suppress warnings by monkey patching before any use of app.view
        monkeyPatchAppView(app);
        
        // @ts-ignore - Ignoring type errors for new PixiJS v8 API
        app.init({
          view: canvas,
          background: 0xdcfce7,
          width: canvas.width,
          height: canvas.height,
          antialias: true,
        });
      } catch (initError) {
        // Fallback for older PixiJS versions
        app = new PIXI.Application({
          view: canvas,
          backgroundAlpha: 1,
          backgroundColor: 0xdcfce7,
          width: canvas.width,
          height: canvas.height,
          antialias: true,
        });
      }
      
      // Store app reference both locally and in the ref
      localApp = app;
      appRef.current = app;

      // Add a debug message to show the canvas dimensions
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      // Create container for the garden with isometric projection
      const gardenContainer = new PIXI.Container();
      
      // Use canvas dimensions directly instead of app.screen
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Position garden container in the center of the screen
      gardenContainer.position.set(canvasWidth / 2, canvasHeight / 2);
      gardenContainer.sortableChildren = true;
      app.stage.addChild(gardenContainer);
      
      // Create a hitArea rectangle for mouse events
      const hitArea = new PIXI.Rectangle(0, 0, canvasWidth, canvasHeight);
      
      // Set up panning capability
      const setupPanning = () => {
        // Add event listeners for panning the garden
        app.stage.eventMode = 'static';
        app.stage.hitArea = hitArea;
        
        // Mouse down event for starting drag
        app.stage.on('pointerdown', (event) => {
          if (event.button === 0) { // Left mouse button
            viewStateRef.current.isDragging = true;
            viewStateRef.current.dragStartX = event.global.x;
            viewStateRef.current.dragStartY = event.global.y;
            viewStateRef.current.lastPositionX = gardenContainer.position.x;
            viewStateRef.current.lastPositionY = gardenContainer.position.y;
            
            // Change cursor to grabbing
            const appCanvas = getCanvas(app);
            if (appCanvas) {
              appCanvas.style.cursor = 'grabbing';
            }
          }
        });
        
        // Mouse move event for dragging/panning
        app.stage.on('pointermove', (event) => {
          const mousePosition = event.global;
          
          // Handle dragging/panning
          if (viewStateRef.current.isDragging) {
            const deltaX = mousePosition.x - viewStateRef.current.dragStartX;
            const deltaY = mousePosition.y - viewStateRef.current.dragStartY;
            
            gardenContainer.position.x = viewStateRef.current.lastPositionX + deltaX;
            gardenContainer.position.y = viewStateRef.current.lastPositionY + deltaY;
            
            // Update view state
            viewStateRef.current.x = gardenContainer.position.x;
            viewStateRef.current.y = gardenContainer.position.y;
          } else {
            // Check if mouse is over any plant when not dragging
            let hoveredPlant: PlantInstance | undefined;
            
            for (const plant of plantsRef.current) {
              const bounds = plant.sprite.getBounds();
              if (mousePosition.x >= bounds.x && 
                  mousePosition.x <= bounds.x + bounds.width &&
                  mousePosition.y >= bounds.y && 
                  mousePosition.y <= bounds.y + bounds.height) {
                hoveredPlant = plant;
                break;
              }
            }
            
            if (hoveredPlant) {
              setHoveredTask(hoveredPlant.task);
              setTooltipPosition({ 
                x: mousePosition.x, 
                y: mousePosition.y - 50 
              });
              
              // Change cursor to pointer when over a plant
              const appCanvas = getCanvas(app);
              if (appCanvas) {
                appCanvas.style.cursor = 'pointer';
              }
            } else {
              setHoveredTask(null);
              
              // Change cursor to grab when not over a plant and not dragging
              const appCanvas = getCanvas(app);
              if (appCanvas) {
                appCanvas.style.cursor = 'grab';
              }
            }
          }
        });
        
        // Mouse up event for ending drag
        app.stage.on('pointerup', () => {
          viewStateRef.current.isDragging = false;
          
          // Change cursor back to grab
          const appCanvas = getCanvas(app);
          if (appCanvas) {
            appCanvas.style.cursor = 'grab';
          }
        });
        
        // Mouse out event to end dragging if mouse leaves canvas
        app.stage.on('pointerout', () => {
          viewStateRef.current.isDragging = false;
        });
      };
      
      // Call the panning setup function
      setupPanning();
      
      // Handle resize
      const resizeHandler = () => {
        if (containerRef.current && app.renderer) {
          const newWidth = containerRef.current.clientWidth;
          const newHeight = containerRef.current.clientHeight;
          
          app.renderer.resize(newWidth, newHeight);
          
          // Update hit area for mouse events
          app.stage.hitArea = new PIXI.Rectangle(0, 0, newWidth, newHeight);
          
          // Update the canvas dimensions directly
          const appCanvas = getCanvas(app);
          if (appCanvas) {
            appCanvas.width = newWidth;
            appCanvas.height = newHeight;
          }
        }
      };
      
      window.addEventListener('resize', resizeHandler);
      
      // Set up zoom handling with mouse wheel
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        if (!appRef.current) return;
        
        const app = appRef.current;
        const gardenContainer = app.stage.getChildAt(0) as PIXI.Container;
        
        // Determine zoom direction
        const zoomDirection = e.deltaY < 0 ? 1 : -1;
        
        // Calculate new zoom level
        const newZoom = Math.max(
          MIN_ZOOM, 
          Math.min(
            MAX_ZOOM, 
            viewStateRef.current.zoom + (zoomDirection * ZOOM_STEP)
          )
        );
        
        // Update zoom if changed
        if (newZoom !== viewStateRef.current.zoom) {
          // Get mouse position relative to container
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate position before zoom
            const beforeZoomX = (mouseX - gardenContainer.position.x) / viewStateRef.current.zoom;
            const beforeZoomY = (mouseY - gardenContainer.position.y) / viewStateRef.current.zoom;
            
            // Apply new zoom
            viewStateRef.current.zoom = newZoom;
            gardenContainer.scale.set(newZoom, newZoom);
            
            // Calculate position after zoom
            const afterZoomX = beforeZoomX * newZoom;
            const afterZoomY = beforeZoomY * newZoom;
            
            // Adjust container position to keep the mouse point fixed
            gardenContainer.position.x += (mouseX - gardenContainer.position.x) - afterZoomX;
            gardenContainer.position.y += (mouseY - gardenContainer.position.y) - afterZoomY;
            
            // Update view state
            viewStateRef.current.x = gardenContainer.position.x;
            viewStateRef.current.y = gardenContainer.position.y;
            
            // Update UI
            setCurrentZoom(newZoom);
          }
        }
      };
      
      // Add wheel event listener
      containerRef.current?.addEventListener('wheel', handleWheel, { passive: false });
      
      // Initial load of tasks
      if (tasks.length > 0) {
        renderBeautifulPlants(app, gardenContainer, tasks);
      }
      
      // Add keyboard navigation event listener
      const handleKeyDown = (e: KeyboardEvent) => {
        const MOVE_AMOUNT = 30; // Distance to move in pixels
        
        if (!appRef.current) return;
        
        const app = appRef.current;
        const gardenContainer = app.stage.getChildAt(0) as PIXI.Container;
        
        switch (e.key) {
          case 'ArrowUp':
            gardenContainer.position.y += MOVE_AMOUNT;
            break;
          case 'ArrowDown':
            gardenContainer.position.y -= MOVE_AMOUNT;
            break;
          case 'ArrowLeft':
            gardenContainer.position.x += MOVE_AMOUNT;
            break;
          case 'ArrowRight':
            gardenContainer.position.x -= MOVE_AMOUNT;
            break;
          case 'Home': // Reset to center
            const canvasWidth = app.renderer.width;
            const canvasHeight = app.renderer.height;
            gardenContainer.position.set(canvasWidth / 2, canvasHeight / 2);
            break;
          case '+': // Zoom in
          case '=': // Also zoom in (= is on the same key as + without shift)
            const newZoomIn = Math.min(MAX_ZOOM, viewStateRef.current.zoom + ZOOM_STEP);
            viewStateRef.current.zoom = newZoomIn;
            gardenContainer.scale.set(newZoomIn, newZoomIn);
            setCurrentZoom(newZoomIn);
            break;
          case '-': // Zoom out
          case '_': // Also zoom out (_ is on the same key as - with shift)
            const newZoomOut = Math.max(MIN_ZOOM, viewStateRef.current.zoom - ZOOM_STEP);
            viewStateRef.current.zoom = newZoomOut;
            gardenContainer.scale.set(newZoomOut, newZoomOut);
            setCurrentZoom(newZoomOut);
            break;
          case '0': // Reset zoom
            viewStateRef.current.zoom = 1.0;
            gardenContainer.scale.set(1.0, 1.0);
            setCurrentZoom(1.0);
            break;
          default:
            return; // Exit if not a navigation key
        }
        
        // Update view state
        viewStateRef.current.x = gardenContainer.position.x;
        viewStateRef.current.y = gardenContainer.position.y;
        
        // Prevent default scrolling
        e.preventDefault();
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      // Return cleanup function
      return () => {
        window.removeEventListener('resize', resizeHandler);
        window.removeEventListener('keydown', handleKeyDown);
        containerRef.current?.removeEventListener('wheel', handleWheel);
        
        // Clear refs immediately to prevent access during unmount
        appRef.current = null;
        plantsRef.current = [];
        
        // Try to clean up PIXI resources if they exist
        try {
          // Try to manually remove the canvas if it still exists
          if (containerRef.current) {
            while (containerRef.current.firstChild) {
              containerRef.current.removeChild(containerRef.current.firstChild);
            }
          }

          // Finally, try to destroy the app if it exists
          if (localApp && localApp.renderer) {
            try {
              localApp.destroy();
            } catch (err) {
              console.error("Could not destroy PIXI application:", err);
            }
          }
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }
      };
    } catch (error) {
      console.error("Error initializing PixiJS:", error);
    }
  }, []); // Empty dependency array to run only once

  // Enhanced function to render beautiful plants
  const renderBeautifulPlants = (_app: PIXI.Application, gardenContainer: PIXI.Container, taskList: any[]) => {
    try {
      console.log('Rendering beautiful plants for', taskList.length, 'tasks');
      
      // Remove existing plants
      plantsRef.current.forEach(plant => {
        gardenContainer.removeChild(plant.sprite);
      });
      plantsRef.current = [];
      
      // Determine garden size based on task count
      const plantSize = 100;  // Base size for plants
      const gridSize = plantSize * 1.5; // Space between plants
      
      // Calculate grid layout - more plants per row for larger gardens
      const plantsPerRow = Math.ceil(Math.sqrt(taskList.length * 2)); 
      const rows = Math.ceil(taskList.length / plantsPerRow);
      
      console.log(`Creating garden grid with ${plantsPerRow} plants per row and ${rows} rows`);
      
      // Offset to center the garden
      const xOffset = ((plantsPerRow - 1) * gridSize) / 2;
      const yOffset = ((rows - 1) * gridSize) / 2;
      
      // Available plant types
      const plantTypes = Object.keys(plantDrawingFunctions) as Array<keyof typeof plantDrawingFunctions>;
      
      // Generate plants in a grid pattern
      taskList.forEach((task, index) => {
        try {
          // Calculate row and column
          const row = Math.floor(index / plantsPerRow);
          const col = index % plantsPerRow;
          
          // Calculate position with semi-isometric projection
          const x = (col * gridSize) - xOffset;
          const y = (row * gridSize * 0.75) - yOffset;
          
          // Add some randomization to positions for a more natural look
          const randomizedX = x + (Math.random() * 20 - 10);
          const randomizedY = y + (Math.random() * 20 - 10);
          
          // Create container for plant
          const plantContainer = new PIXI.Container();
          plantContainer.position.set(randomizedX, randomizedY);
          plantContainer.zIndex = 10 + row; // Higher row = higher zIndex for proper layering
          
          // Determine plant type based on task properties or randomly
          let plantType: keyof typeof plantDrawingFunctions;
          
          // Use task attributes to determine plant type if available
          if (task.name) {
            const taskName = task.name.toLowerCase();
            
            if (taskName.includes('research') || taskName.includes('planning')) {
              plantType = 'tree';
            } else if (taskName.includes('design') || taskName.includes('creative')) {
              plantType = 'flower';
            } else if (taskName.includes('meeting') || taskName.includes('discussion')) {
              plantType = 'bush';
            } else if (taskName.includes('bug') || taskName.includes('fix')) {
              plantType = 'mushroom';
            } else if (taskName.includes('infrastructure') || taskName.includes('setup')) {
              plantType = 'rock';
            } else if (taskName.includes('documentation') || taskName.includes('writing')) {
              plantType = 'grass';
            } else if (taskName.includes('development') || taskName.includes('coding')) {
              plantType = 'cactus';
            } else {
              // Random plant type if no keyword match
              plantType = randomChoice(plantTypes);
            }
          } else {
            // Random plant type if no task name
            plantType = randomChoice(plantTypes);
          }
          
          // Create graphics for plant
          const graphics = new PIXI.Graphics();
          
          // Draw plant using the appropriate function
          plantDrawingFunctions[plantType](graphics, plantSize);
          
          // Add graphics to container
          plantContainer.addChild(graphics);
          
          // Add container to garden
          gardenContainer.addChild(plantContainer);
          
          // Save reference
          plantsRef.current.push({
            id: task.id,
            x,
            y,
            sprite: plantContainer as unknown as PIXI.Sprite,
            task,
          });
        } catch (taskError) {
          console.error(`Error rendering task ${task.id}:`, taskError);
        }
      });
      
      console.log(`✅ Successfully rendered ${plantsRef.current.length} beautiful plants`);
    } catch (error) {
      console.error("Error rendering beautiful plants:", error);
    }
  };

  // Update plants when tasks change
  useEffect(() => {
    if (!appRef.current || !tasks.length) {
      console.log('Not rendering plants: app or tasks not available', { 
        appExists: !!appRef.current, 
        tasksCount: tasks.length 
      });
      return;
    }
    
    console.log('Tasks changed, rendering plants for', tasks.length, 'tasks');
    
    try {
      const app = appRef.current;
      
      // Check if stage has children before accessing
      if (!app.stage || app.stage.children.length === 0) {
        console.log('App stage not ready');
        return;
      }
      
      const gardenContainer = app.stage.getChildAt(0) as PIXI.Container;
      
      // Use enhanced plant rendering
      renderBeautifulPlants(app, gardenContainer, tasks);
    } catch (error) {
      console.error("Error updating plants:", error);
    }
  }, [tasks]);

  // Function to zoom in
  const zoomIn = () => {
    if (!appRef.current) return;
    
    const app = appRef.current;
    const gardenContainer = app.stage.getChildAt(0) as PIXI.Container;
    
    const newZoom = Math.min(MAX_ZOOM, viewStateRef.current.zoom + ZOOM_STEP);
    viewStateRef.current.zoom = newZoom;
    gardenContainer.scale.set(newZoom, newZoom);
    setCurrentZoom(newZoom);
  };
  
  // Function to zoom out
  const zoomOut = () => {
    if (!appRef.current) return;
    
    const app = appRef.current;
    const gardenContainer = app.stage.getChildAt(0) as PIXI.Container;
    
    const newZoom = Math.max(MIN_ZOOM, viewStateRef.current.zoom - ZOOM_STEP);
    viewStateRef.current.zoom = newZoom;
    gardenContainer.scale.set(newZoom, newZoom);
    setCurrentZoom(newZoom);
  };
  
  // Function to reset zoom
  const resetZoom = () => {
    if (!appRef.current) return;
    
    const app = appRef.current;
    const gardenContainer = app.stage.getChildAt(0) as PIXI.Container;
    
    viewStateRef.current.zoom = 1.0;
    gardenContainer.scale.set(1.0, 1.0);
    setCurrentZoom(1.0);
  };

  // Function to reset the garden view to center
  const resetGardenView = () => {
    if (!appRef.current) return;
    
    const app = appRef.current;
    const gardenContainer = app.stage.getChildAt(0) as PIXI.Container;
    
    // Reset to center
    const canvasWidth = app.renderer.width;
    const canvasHeight = app.renderer.height;
    gardenContainer.position.set(canvasWidth / 2, canvasHeight / 2);
    
    // Reset zoom
    viewStateRef.current.zoom = 1.0;
    gardenContainer.scale.set(1.0, 1.0);
    setCurrentZoom(1.0);
    
    // Update view state
    viewStateRef.current.x = gardenContainer.position.x;
    viewStateRef.current.y = gardenContainer.position.y;
  };

  return (
    <div className="w-full h-full relative">
      <div 
        ref={containerRef} 
        className="garden-container w-full h-full" 
      />
      
      {hoveredTask && (
        <div 
          className="absolute z-10 bg-white p-2 rounded shadow-lg max-w-xs"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-semibold">{hoveredTask.name}</div>
          <div className="text-gray-500 text-xs">
            Completed: {new Date(hoveredTask.completed_at).toLocaleDateString()}
          </div>
        </div>
      )}
      
      <GardenControls 
        onReset={resetGardenView} 
        totalPlants={tasks.length} 
        zoom={currentZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
      />
    </div>
  );
};

export default Garden;