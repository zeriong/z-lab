import * as fs from 'fs'
import * as path from 'path'

interface StageDef {
  id: number
  name: string
  theme: string
  birds: any[]
  pigs: any[]
  bodies: any[]
  constraints?: any[]
  targetScore: number
}

function validateStage(filePath: string, stageNum: number): [boolean, string] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Validate schema
    if (!data.id || !data.name || !data.theme) {
      return [false, `Stage ${stageNum}: Missing required fields`]
    }

    // Check birds
    if (!Array.isArray(data.birds) || data.birds.length === 0) {
      return [false, `Stage ${stageNum}: No birds defined`]
    }

    // Check pigs
    if (!Array.isArray(data.pigs) || data.pigs.length === 0) {
      return [false, `Stage ${stageNum}: No pigs defined`]
    }

    // Check bodies
    if (!Array.isArray(data.bodies)) {
      return [false, `Stage ${stageNum}: No bodies defined`]
    }

    // Check material references
    const validMaterials = ['glass', 'wood', 'stone', 'tnt']
    for (const body of data.bodies) {
      if (!validMaterials.includes(body.material)) {
        return [false, `Stage ${stageNum}: Invalid material ${body.material}`]
      }
    }

    // Check constraint references
    if (Array.isArray(data.constraints)) {
      for (const constraint of data.constraints) {
        if (constraint.aIndex < 0 || constraint.aIndex >= data.bodies.length) {
          return [false, `Stage ${stageNum}: Invalid constraint reference aIndex`]
        }
        if (constraint.bIndex !== null && constraint.bIndex !== undefined) {
          if (constraint.bIndex < 0 || constraint.bIndex >= data.bodies.length) {
            return [false, `Stage ${stageNum}: Invalid constraint reference bIndex`]
          }
        }
      }
    }

    // Check body count limit (80)
    if (data.bodies.length + data.pigs.length > 80) {
      return [false, `Stage ${stageNum}: Too many bodies (${data.bodies.length + data.pigs.length} > 80)`]
    }

    // Check no initial overlaps (basic)
    for (let i = 0; i < data.bodies.length; i++) {
      for (let j = i + 1; j < data.bodies.length; j++) {
        const b1 = data.bodies[i]
        const b2 = data.bodies[j]
        const dist = Math.sqrt((b1.x - b2.x) ** 2 + (b1.y - b2.y) ** 2)
        const minDist = (b1.r || 20) + (b2.r || 20)
        if (dist < minDist) {
          return [false, `Stage ${stageNum}: Bodies overlap at indices ${i} and ${j}`]
        }
      }
    }

    return [true, `Stage ${stageNum}: OK`]
  } catch (e) {
    return [false, `Stage ${stageNum}: ${(e as Error).message}`]
  }
}

function main() {
  const stagesDir = path.join(__dirname, '../src/data/stages')
  let validCount = 0
  let failures: string[] = []

  for (let i = 1; i <= 10; i++) {
    const filePath = path.join(stagesDir, `${String(i).padStart(2, '0')}.json`)
    if (!fs.existsSync(filePath)) {
      failures.push(`Stage ${i}: File not found`)
      continue
    }

    const [valid, message] = validateStage(filePath, i)
    if (valid) {
      validCount++
    } else {
      failures.push(message)
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure)
    }
    process.exit(1)
  }

  console.log(`${validCount}/10 stages valid`)
  process.exit(0)
}

main()
