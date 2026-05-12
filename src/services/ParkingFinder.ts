/**
 * Module 5: 就近停车点推荐服务
 *
 * Demo版返回模拟停车点数据，后续接入真实地图API。
 * 仅语音播报地点名称与方位，不弹窗不跳转导航。
 */
import { ParkingSpot } from '@/types'

/** 模拟停车点数据库 */
const DEMO_PARKING_SPOTS: ParkingSpot[] = [
  { id: 'p1', name: '阳光服务区', distance: 1200, direction: '前方约1.2公里', type: 'service_area', recommended: true },
  { id: 'p2', name: '星河停车场', distance: 2300, direction: '右转约2.3公里', type: 'parking_lot', recommended: true },
  { id: 'p3', name: '湖畔路边休息区', distance: 800, direction: '左侧约800米', type: 'roadside', recommended: false },
  { id: 'p4', name: '绿洲高速服务区', distance: 5600, direction: '前方约5.6公里', type: 'service_area', recommended: true },
  { id: 'p5', name: '城市广场地下停车场', distance: 1500, direction: '右转约1.5公里', type: 'parking_lot', recommended: false },
  { id: 'p6', name: '观景台临时停车区', distance: 3400, direction: '前方约3.4公里', type: 'rest_area', recommended: false },
]

/** 停车点类型中文名映射 */
const TYPE_NAMES: Record<string, string> = {
  service_area: '服务区',
  parking_lot: '停车场',
  roadside: '路边休息区',
  rest_area: '临时停车区',
}

export class ParkingFinder {
  /**
   * 查找附近停车点
   * Demo版随机返回2-3个推荐点
   */
  findNearby(): ParkingSpot[] {
    // 打乱后取前3个推荐点
    const recommended = DEMO_PARKING_SPOTS
      .filter(s => s.recommended)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    console.log(`[ParkingFinder] 🅿 找到 ${recommended.length} 个推荐停车点`)
    return recommended
  }

  /**
   * 生成停车点推荐语音文本（供TTS播报）
   */
  generateSpotsText(spots: ParkingSpot[]): string {
    if (!spots.length) {
      return '抱歉，暂时没有找到附近的停车推荐。'
    }

    const lines = spots.map((s, i) => {
      const typeName = TYPE_NAMES[s.type] || '停车点'
      return `第${i + 1}个是${s.name}，${typeName}，${s.direction}。`
    })

    return '好的，我帮你找到了几个附近的停车点。' + lines.join('') + '请注意安全驾驶。'
  }

  /** 获取停车点类型名称 */
  getTypeName(type: string): string {
    return TYPE_NAMES[type] || '停车点'
  }
}
