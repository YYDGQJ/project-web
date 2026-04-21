<template>
  <div class="contract-page">
    <CommonQueryCard
      v-model:query-columns="queryColumns"
      title="查询条件"
      :show-reset="true"
      :show-column-setting="true"
      :model="query"
      :fields="queryFields"
      @submit="handleSearchSubmit"
      @reset="resetQuery"
    />

    <div class="table-wrap">
      <CommonTable
        ref="commonTableRef"
        :data="tableData"
        :columns="tableColumns"
        :loading="loading.querying"
        :total="total"
        :operation-mode="operationMode"
        :selection="tableSelection"
        :editing="tableEditing"
        name="合同信息列表"
        row-key="orderNo"
        @pagination-change="handlePaginationChange"
        @selection-change="handleSelectionChange"
        @edit-cell-change="handleEditCellChange"
        @edit-submit="handleEditSubmit"
        @create-submit="handleCreateSubmit"
        @delete-submit="handleDeleteSubmit"
        border
        stripe
        table-style="width: 100%; height: 100%;"
      >
        <template #toolbar-info>
          <div class="table-toolbar-summary">
            已选 {{ selectedRows.length }} 条，合计重量 {{ selectedWeight }}
          </div>
        </template>
      </CommonTable>
    </div>

    <div class="query-action-bar">
      <div class="query-action-wrap">
        <div class="query-action-left">
          <el-button type="primary" :disabled="actionLocked" @click="handleSearchSubmit">查询</el-button>
          <el-button :disabled="actionLocked" @click="startEditMode">编辑</el-button>
          <el-button :disabled="actionLocked" @click="startCreateMode">新增</el-button>
          <el-button type="danger" :disabled="actionLocked || !selectedRows.length" @click="startDeleteMode">删除</el-button>
        </div>
        <div v-if="actionLocked" class="query-action-right">
          <el-button type="primary" @click="confirmCurrentAction">确认</el-button>
          <el-button @click="cancelCurrentAction">取消</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getErrorMessage, post } from '../../../common/request'
import CommonTable, { type CommonTableColumn } from '../../../components/table/CommonTable.vue'
import CommonQueryCard from '../../../components/CommonQueryCard.vue'
import type { CommonCardFieldConfig } from '../../../components/common-card.types'

interface ContractItem {
  orderNo?: string
  saleOrderNo?: string
  contractNo?: string
  companyName?: string
  orderRecvTime?: string
  orderCustCode?: string
  orderCustCname?: string
  orderStatus?: string
  orderTypeCode?: string
  prodClassCode?: string
  prodCode?: string
  prodCname?: string
  companyCode?: string
  saleOrgCode?: string
  orderQty?: number | string
  orderWt?: number | string
  days?: number | string
  orderCreateTime?: string
}

interface PageResponse<T> {
  records?: T[]
  total?: number
  current?: number
  size?: number
  rows?: T[]
  list?: T[]
}

const query = reactive({
  orderNo: '',
  saleOrderNo: '',
  contractNo: '',
  orderCustCode: '',
  orderCustCname: '',
  orderStatus: '',
  orderTypeCode: '',
  prodClassCode: '',
  prodCode: '',
  companyCode: '',
  saleOrgCode: '',
  queryTimeRange: [] as [string, string] | [],
})
const queryFields: CommonCardFieldConfig[] = [
  { type: 'input', model: 'orderNo', placeholder: '请输入合同号', enabled: true, label: '合同号' },
  { type: 'input', model: 'saleOrderNo', placeholder: '请输入销售合同号', enabled: true, label: '销售合同号' },
  { type: 'input', model: 'contractNo', placeholder: '请输入合约号', enabled: true, label: '合约号' },
  { type: 'input', model: 'orderCustCode', placeholder: '请输入订货用户代码', enabled: true, label: '订货用户代码' },
  { type: 'input', model: 'orderCustCname', placeholder: '请输入订货用户名称', enabled: true, label: '订货用户名称' },
  {
    type: 'select',
    model: 'orderStatus',
    placeholder: '请选择合同状态',
    enabled: true,
    label: '合同状态',
    options: [
      { label: '已生效', value: 'active' },
      { label: '已作废', value: 'cancelled' },
      { label: '草稿', value: 'draft' }
    ],
  },
  {
    type: 'select',
    model: 'orderTypeCode',
    placeholder: '请选择合同性质代码',
    enabled: true,
    label: '合同性质代码',
    options: [
      { label: '普通', value: 'normal' },
      { label: '补充', value: 'supplement' },
      { label: '框架', value: 'framework' }
    ]
  },
  {
    type: 'select',
    model: 'prodClassCode',
    placeholder: '请选择产品大类代码',
    enabled: true,
    label: '产品大类代码',
    options: [
      { label: '钢材', value: 'steel' },
      { label: '有色金属', value: 'nonferrous' },
      { label: '化工', value: 'chemical' }
    ]
  },
  {
    type: 'select',
    model: 'prodCode',
    placeholder: '请选择品名代码',
    enabled: true,
    label: '品名代码',
    options: [
      { label: '螺纹钢', value: 'rebar' },
      { label: '热轧卷', value: 'hotroll' },
      { label: '铝锭', value: 'aluminum' }
    ],
    multi: true
  },
  {
    type: 'select',
    model: 'companyCode',
    placeholder: '请选择账套代码',
    enabled: true,
    label: '账套代码',
    options: [
      { label: '主账套', value: 'main' },
      { label: '分账套A', value: 'subA' },
      { label: '分账套B', value: 'subB' }
    ]
  },
  {
    type: 'select',
    model: 'saleOrgCode',
    placeholder: '请选择销售组织机构代码',
    enabled: true,
    label: '销售组织机构代码',
    options: [
      { label: '总部', value: 'hq' },
      { label: '华东分公司', value: 'east' },
      { label: '华南分公司', value: 'south' }
    ]
  },
  { type: 'datetimerange', model: 'queryTimeRange', placeholder: '创建时间区间', enabled: true, label: '创建时间区间' }
]
const queryColumns = ref(6)
const tableData = ref<ContractItem[]>([])
const serverTotal = ref(0)
const total = computed(() => Math.max(serverTotal.value, tableData.value.length))
const loading = reactive({ querying: false })

const requestPageState = reactive({
  currentPage: 1,
  pageSize: 100
})

const commonTableRef = ref<{
  resetPagination: () => void
  confirmPendingChanges: () => Promise<boolean> | boolean
  cancelPendingChanges: () => boolean
} | null>(null)
const operationMode = ref<'idle' | 'edit' | 'create' | 'delete'>('idle')
const selectedRows = ref<ContractItem[]>([])
const selectedKeys = ref<Array<string | number | undefined>>([])
const tableSelection = { mode: 'multiple' as const, keyField: 'orderNo' }
const tableEditing = { enabled: true, allowCreate: true, allowDelete: true }
const actionLocked = computed(() => operationMode.value !== 'idle')
const selectedWeight = computed(() => {
  const totalWeight = selectedRows.value.reduce((sum, row) => sum + Number(row.orderWt ?? 0), 0)
  return totalWeight.toFixed(2)
})

const tableColumns: CommonTableColumn[] = [
  { prop: 'companyName', label: '公司账套名称', editable: true, editorType: 'input' },
  { prop: 'orderRecvTime', label: '合同接收时间', editable: true, editorType: 'datetime' },
  {
    prop: 'orderTypeCode',
    label: '合同性质代码',
    editable: true,
    editorType: 'select',
    editorOptions: [
      { label: '普通', value: 'normal' },
      { label: '补充', value: 'supplement' },
      { label: '框架', value: 'framework' }
    ]
  },
  { prop: 'exportFlag', label: '出口标记' },
  { prop: 'delivyDateAccu', label: '交货日期精度' },
  { prop: 'apnDesc', label: '最终用途描述' },
  { prop: 'finUserCode', label: '最终用户代码' },
  { prop: 'finUserName', label: '最终用户名称' },
  { prop: 'msc', label: '冶金规范码' },
  { prop: 'sgSign', label: '钢牌号' },
  {
    prop: 'prodCode',
    label: '品名代码',
    editable: true,
    editorType: 'select',
    editorOptions: [
      { label: '螺纹钢', value: 'rebar' },
      { label: '热轧卷', value: 'hotroll' },
      { label: '铝锭', value: 'aluminum' }
    ]
  },
  { prop: 'prodCname', label: '品名中文', editable: true, editorType: 'input' },
  { prop: 'prodAliasCname', label: '品名中文别名' },
  { prop: 'stdSgCode', label: '标准牌号代码' },
  { prop: 'surfaceAccuClassCode', label: '表面精度大类代码' },
  { prop: 'surfaceAccu', label: '表面精度' },
  { prop: 'surfaceAccuCode', label: '表面精度代码' },
  { prop: 'custStdCode', label: '客户标准代码' },
  { prop: 'prodDifDesc', label: '产品分类描述' },
  { prop: 'delivyWtFlag', label: '交货量标识' },
  { prop: 'packWtMin', label: '捆包重量最小值' },
  { prop: 'packWtMax', label: '捆包重量最大值' },
  { prop: 'packBl', label: '包装块数' },
  { prop: 'sprayPrintReq', label: '喷印要求' },
  { prop: 'trimFlag', label: '切边标记' },
  { prop: 'orderThickTolMax', label: '订货厚度公差上限' },
  { prop: 'orderWidthTolMax', label: '订货宽度公差上限' },
  { prop: 'orderWidthMax', label: '订货宽度上限' },
  { prop: 'orderLen', label: '订货长度' },
  { prop: 'orderLenMax', label: '订货长度上限' },
  { prop: 'nomTimLen', label: '额定最终产品单倍尺长度' },
  { prop: 'orderShortRate', label: '订货短尺率' },
  { prop: 'orderInnerDia', label: '订货内径' },
  { prop: 'orderWalThick', label: '订货壁厚' },
  { prop: 'crossCode', label: '截面代码' },
  { prop: 'lenTolCode', label: '长度公差代码' },
  { prop: 'orderPieceAimWt', label: '订货单件重量目标值' },
  { prop: 'delivyTolMax', label: '交货公差上限' },
  { prop: 'delivyTolMin', label: '交货公差下限' },
  { prop: 'delivyNumTolMinus', label: '交货件数负公差' },
  { prop: 'orderQty', label: '订货数量', editable: true, editorType: 'number', required: '订货数量不能为空' },
  { prop: 'contractConfirmTime', label: '合约确认时间' },
  { prop: 'saleOrderNo', label: '销售合同号' },
  { prop: 'orderCustCode', label: '订货用户代码' },
  { prop: 'orderCustCname', label: '订货用户中文名称' },
  { prop: 'consigneeCode', label: '收货单位代码' },
  { prop: 'consigneeCname', label: '收货单位中文名称' },
  { prop: 'consigneeAddr', label: '收货单位地址' },
  { prop: 'settleUserCname', label: '结算用户中文全称' },
  { prop: 'transModeCode', label: '运输方式代码' },
  { prop: 'transModeName', label: '运输方式名称' },
  { prop: 'delivySiteName', label: '交货地点名称' },
  { prop: 'freightInvTitleDesc', label: '运费发票抬头描述' },
  { prop: 'privateRailwayCode', label: '专用线代码' },
  { prop: 'privateRailwayName', label: '专用线名称' },
  { prop: 'saleNetworkCode', label: '销售渠道代码' },
  { prop: 'demandCustCode', label: '需方用户代码' },
  { prop: 'demandCustName', label: '需方用户名称' },
  { prop: 'specTransReqDesc', label: '特殊运输要求描述' },
  { prop: 'orderModiType', label: '合同变更性质' },
  { prop: 'orderModiRespId', label: '合同变更人' },
  { prop: 'orderModiNum', label: '合同变更次数' },
  { prop: 'orderChangeTime', label: '合同变更时间' },
  { prop: 'orderModiPutDeptCode', label: '合同变更提出方代码' },
  { prop: 'orderModiPutDeptDesc', label: '合同变更提出方说明' },
  { prop: 'markPosDesc', label: '标记位置说明' },
  { prop: 'orderProcRespId', label: '合同处理责任者' },
  { prop: 'stdVersion', label: '标准版本号' },
  { prop: 'orderThickEng', label: '英制订货厚度' },
  { prop: 'orderWidthEng', label: '英制订货宽度' },
  { prop: 'orderIndmEng', label: '英制订货内径' },
  { prop: 'orderHighEng', label: '英制订货高度' },
  { prop: 'orderConfirmTime', label: '合同确认时间' },
  { prop: 'orderTypeDesc', label: '合同性质描述' },
  { prop: 'shceduleDateF', label: '排产结束日期' },
  { prop: 'shceduleDateS', label: '排产开始日期' },
  { prop: 'bandProdCode', label: '供料品种代码' },
  { prop: 'gatherFlag', label: '集批标志' },
  { prop: 'transMatFlag', label: '过渡料标识' },
  { prop: 'custOrderStatus', label: '定制合同状态' },
  { prop: 'mergOrderNo', label: '归并合同号' },
  { prop: 'productClass', label: '产品大类内部码' },
  { prop: 'productClassDesc', label: '产品大类内部码描述' },
  { prop: 'signCode', label: '钢级代码' },
  { prop: 'orderThickMax', label: '订单厚度上限' },
  { prop: 'speedClassCode', label: '速度等级代码' },
  { prop: 'speedClassDesc', label: '速度等级描述' },
  { prop: 'slabPosReqDesc', label: '位置坯要求描述' },
  { prop: 'delivyWeekFlag', label: '按周交货标志' },
  { prop: 'delivyPriority', label: '订单发货优先级' },
  { prop: 'orderLaunchRespName', label: '合同下发人姓名' },
  { prop: 'engiProjectName', label: '工程名称' },
  { prop: 'trapeziumType', label: '梯形种类' },
  { prop: 'lenAimEng', label: '英制目标长度' },
  { prop: 'packSheetNum', label: '单包张数' },
  { prop: 'prmsWeldingDot', label: '焊道接点' },
  { prop: 'accpModeCode', label: '验收方式代码' },
  { prop: 'laceType', label: '花边种类' },
  { prop: 'mark2', label: '唛头2' },
  { prop: 'engLabelFlag', label: '英文标签标记' },
  { prop: 'colorSign', label: '色标' },
  { prop: 'labelFormatCode', label: '标签格式代码' },
  { prop: 'destProd', label: '去向(制造)' },
  { prop: 'applyPlanNo', label: '申请计划号' },
  { prop: 'comeProcAgreeNo', label: '来料加工协议号' },
  { prop: 'specThick1', label: '特殊厚度1' },
  { prop: 'specThick3', label: '特殊厚度3' },
  { prop: 'specThick5', label: '特殊厚度5' },
  { prop: 'specialLen1', label: '特殊长度1' },
  { prop: 'specialLen4', label: '特殊长度4' },
  { prop: 'specialLen5', label: '特殊长度5' },
  { prop: 'specialThick2Eng', label: '英制特殊厚度2' },
  { prop: 'specialThick6Eng', label: '英制特殊厚度6' },
  { prop: 'specialThick7Eng', label: '英制特殊厚度7' },
  { prop: 'specialThick1Eng', label: '英制特殊厚度1' },
  { prop: 'specialThick3Eng', label: '英制特殊厚度3' },
  { prop: 'specialThick5Eng', label: '英制特殊厚度5' },
  { prop: 'specialLen2Eng', label: '特殊英制长度2' },
  { prop: 'specialLen5Eng', label: '特殊英制长度5' },
  { prop: 'color1', label: '色标颜色1' },
  { prop: 'color2', label: '色标颜色2' },
  { prop: 'color4', label: '色标颜色4' },
  { prop: 'color5', label: '色标颜色5' },
  { prop: 'colorWidth', label: '色标宽度' },
  { prop: 'shippingMark1', label: '大唛头1' },
  { prop: 'shippingMark3', label: '大唛头3' },
  { prop: 'shippingMark4', label: '大唛头4' },
  { prop: 'shippingMark5', label: '大唛头5' },
  { prop: 'giveSampleLen', label: '奉送样长度' },
  { prop: 'bandOriginCode2', label: '供料来源代码2' },
  { prop: 'bandProdCode2', label: '供料品种代码2' },
  { prop: 'thickAccuGrade', label: '厚度精度' },
  { prop: 'trapezoidLeftBottomAngle', label: '梯形左底角' },
  { prop: 'boxBatHpsm', label: '盒板加工方式' },
  { prop: 'giveSampleFlag', label: '奉送样标记' },
  { prop: 'carMachineDesc', label: '汽车主机厂/配套厂描述' },
  { prop: 'selfProductDesc', label: '合资/自主品牌标识描述' },
  { prop: 'keyProdDesc', label: '重点产品描述' },
  { prop: 'ordCardNo', label: '订货卡号' },
  { prop: 'upmarketLeaderFlag', label: '高端/领先标志' },
  { prop: 'eviNo', label: 'EVI项目号' },
  { prop: 'vehicleDesc', label: '车型描述' },
  { prop: 'labelPosDesc', label: '标签位置描述' },
  { prop: 'inquiryCode', label: '询单代码' },
  { prop: 'crossDesc', label: '截面描述' },
  { prop: 'supervisionUnit', label: '监造单位' },
  { prop: 'slabCleanFlag', label: '铸坯清理标识' },
  { prop: 'densityValue', label: '密度' },
  { prop: 'resourceFactoryDivCode', label: '资源产线代码' },
  { prop: 'applyFlag', label: '申请标志' },
  { prop: 'timWidth', label: '单倍尺宽度' },
  { prop: 'addSlingFlag', label: '加吊带标识' },
  { prop: 'labelPrintLinkman', label: '标签打印联系人' },
  { prop: 'fixStatusDesc', label: '定尺状态描述' },
  { prop: 'delivyTransModeCode', label: '出厂运输方式代码' },
  { prop: 'coverFlag', label: '苫盖标记' },
  { prop: 'shippingMark6', label: '大唛头6' },
  { prop: 'bandOriginCode7', label: '供料来源代码7' },
  { prop: 'metricOrEngFlag', label: '公英制标志' },
  { prop: 'outputArea', label: '产地' },
  { prop: 'bandOriginCode', label: '供料来源代码' },
  { prop: 'orderUnitCname', label: '订货计量单位中文' },
  { prop: 'wtModeName', label: '计重方式名称' },
  { prop: 'settleModeCode', label: '结算方式代码' },
  { prop: 'deliyDate', label: '交货期' },
  { prop: 'fixFlag', label: '定尺标记' },
  { prop: 'surQualityCode', label: '表面质量等级代码' },
  { prop: 'orderThickMin', label: '订单厚度下限' },
  { prop: 'lastChargeShipDate', label: '最晚装船日期' },
  { prop: 'widthDivi', label: '宽度区分' },
  { prop: 'certiPrintCopies', label: '质保书打印份数' },
  { prop: 'specThick4', label: '特殊厚度4' },
  { prop: 'orderPlanSendTime', label: '合同计划下发时刻' },
  { prop: 'orderDelivyFlag', label: '合同发货完成标记' },
  { prop: 'holeWt', label: '孔重' },
  { prop: 'saleOrgName', label: '销售组织机构名称' },
  { prop: 'delivyWtTolPlus', label: '交货重量正公差' },
  { prop: 'sendNum', label: '发送次数' },
  { prop: 'lpType', label: 'LP类型' },
  { prop: 'trapeziumToplengthEng', label: '英制梯形上底长' },
  { prop: 'trapeziumBottomlengthEng', label: '英制梯形下底长' },
  { prop: 'orderConfirmRespId', label: '合同确认责任者' },
  { prop: 'ingotCode', label: '锭型代码' },
  { prop: 'settleUserEnameAll', label: '结算用户英文全称' },
  { prop: 'prodAliasEname', label: '品名英文别名' },
  { prop: 'prodDif', label: '产品分类' },
  { prop: 'packBlMin', label: '包装最小块数' },
  { prop: 'lenTolPlus', label: '长度正公差' },
  { prop: 'multipleNum', label: '倍尺数' },
  { prop: 'custPurOrderNo', label: '客户购单号' },
  { prop: 'bandProdCode5', label: '供料品种代码5' },
  { prop: 'archiveFlag', label: '归档标记' },
  { prop: 'slabLowestQualityGrade', label: '铸坯最低质量等级' },
  { prop: 'carMachineFlag', label: '汽车主机厂/配套厂标识' },
  { prop: 'vehicleModeNo', label: '车型编码' },
  { prop: 'labelPos', label: '标签位置' },
  { prop: 'orderUnitMinWt', label: '订货重量单件最小值' },
  { prop: 'shipDelivyDate', label: '船期交货日期' },
  { prop: 'packTypeCode', label: '包装类型代码' },
  { prop: 'specialLen4Eng', label: '特殊英制长度4' },
  { prop: 'orderCreateTime', label: '合同创建时间' },
  { prop: 'lengthDivi', label: '倍尺/厚板长度范围尺订货区分' },
  { prop: 'orderMonth', label: '合同月' },
  { prop: 'widthTolCode', label: '宽度公差代码' },
  { prop: 'thickMethodDesc', label: '计厚方式说明' },
  { prop: 'delivyWtTolMinus', label: '交货重量负公差' },
  { prop: 'expLotNo', label: '外销批次号' },
  { prop: 'orderCustEname', label: '订货用户英文名称' },
  { prop: 'newTestNo', label: '新试号' },
  { prop: 'orderHoldFlag', label: '合同封锁标志' },
  { prop: 'holdRespId', label: '封锁责任者' },
  { prop: 'lenTolMinus', label: '长度负公差' },
  { prop: 'specialThick4Eng', label: '英制特殊厚度4' },
  { prop: 'thickAccuGradeCode', label: '厚度精度代码' },
  { prop: 'steelScrapProc', label: '废钢处理方式' },
  { prop: 'supplierId', label: '供应商ID' },
  { prop: 'prodConfigCode', label: '产品配置码' },
  { prop: 'signCode3', label: '副钢级代码3' },
  { prop: 'outerPlateO5Desc', label: '外板/O5标识描述' },
  { prop: 'comeProcType', label: '来料加工方式' },
  { prop: 'saleMode', label: '销售方式' },
  { prop: 'delivyStatusCode', label: '交货状态代码' },
  { prop: 'orderThick', label: '订货厚度' },
  { prop: 'orderWidthMin', label: '订货宽度下限' },
  { prop: 'bandOriginCode5', label: '供料来源代码5' },
  { prop: 'bandProdCode4', label: '供料品种代码4' },
  { prop: 'archiveStampNo', label: '归档邮戳号' },
  { prop: 'cthMeasureMethod', label: '涂镀计厚方式' },
  { prop: 'orderReadyDate', label: '合同备妥日期' },
  { prop: 'orderLaunchTime', label: '合同下发时间' },
  { prop: 'orderEngLenMax', label: '订货英制长度最大' },
  { prop: 'exchangeMatFlag', label: '可窜货标识' },
  { prop: 'orderClassificationSocietyDesc', label: '订货船级社描述' },
  { prop: 'fixStatusCode', label: '定尺状态代码' },
  { prop: 'orderNum', label: '订货件数' },
  { prop: 'specialLen3Eng', label: '特殊英制长度3' },
  { prop: 'sectionNo', label: '分段号' },
  { prop: 'productOrderNo', label: '成品合同号' },
  { prop: 'orderOuterDia', label: '订货外径' },
  { prop: 'settleUserCode', label: '结算用户代码' },
  { prop: 'freightInvTitleCode', label: '运费发票抬头代码' },
  { prop: 'saleProdCode', label: '销售品种代码' },
  { prop: 'orderLenMin', label: '订货长度下限' },
  { prop: 'thickRepairFlag', label: '厚度补偿标记' },
  { prop: 'surfStatusCode', label: '表面处理代码' },
  { prop: 'trapezoidRightBottomAngle', label: '梯形右底角' },
  { prop: 'companyCode', label: '账套代码' },
  { prop: 'accpDeptId', label: '验收部门代码' },
  { prop: 'specialLen3', label: '特殊长度3' },
  { prop: 'orderForceModiFlag', label: '合同强制变更标志' },
  { prop: 'orderWidthEngMax', label: '英制订货宽度上限' },
  { prop: 'delivyNumTolPlus', label: '交货件数正公差' },
  { prop: 'deliveryPlaceName', label: '终到站港描述（首端交货地）' },
  { prop: 'prodClassCode', label: '产品大类代码' },
  { prop: 'urgOrderFlag', label: '紧急合同标记' },
  { prop: 'hopeDelivyDate', label: '期望交货日期' },
  { prop: 'pickDelivyFlag', label: '提单交货标志' },
  { prop: 'bandOriginCode4', label: '供料来源代码4' },
  { prop: 'orderLaunchTimes', label: '合同下发次数' },
  { prop: 'sampleReqCode', label: '取样要求代码' },
  { prop: 'sgSignClass', label: '钢级大类' },
  { prop: 'prodClassDesc', label: '产品大类码描述' },
  { prop: 'shippingMarkA', label: '小唛头1' },
  { prop: 'shippingMark7', label: '大唛头7' },
  { prop: 'bandProdCode7', label: '供料品种代码7' },
  { prop: 'scienProjectNo', label: '科研项目号' },
  { prop: 'epContractVersionNo', label: '工程合同版本号' },
  { prop: 'orderWidthEngMin', label: '英制订货宽度下限' },
  { prop: 'printType', label: '打印类型' },
  { prop: 'thickMethodCode', label: '计厚方式代码' },
  { prop: 'orderUnitMaxWt', label: '订货重量单件最大值' },
  { prop: 'packTypeCname', label: '包装类型描述(中文)' },
  { prop: 'trimMode', label: '切边方式' },
  { prop: 'shortSizeMin', label: '短尺下限' },
  { prop: 'bandOriginCode3', label: '供料来源代码3' },
  { prop: 'orderLaunchRespId', label: '合同下发人工号' },
  { prop: 'specThick2', label: '特殊厚度2' },
  { prop: 'specialReqFlag', label: '特殊要求标志' },
  { prop: 'orderConfirmFlag', label: '合同确认标志' },
  { prop: 'signCode1', label: '副钢级代码1' },
  { prop: 'newProdYear', label: '新产品转产年份' },
  { prop: 'authProjectNo', label: '认证项目号' },
  { prop: 'orderUnitCode', label: '订货计量单位代码' },
  { prop: 'deliveDateIn', label: '厂内交货期' },
  { prop: 'apnCode', label: '最终用途码' },
  { prop: 'prodEname', label: '品名英文' },
  { prop: 'userStd', label: '客户标准' },
  { prop: 'holdTime', label: '封锁时间' },
  { prop: 'packBlMax', label: '包装最大块数' },
  { prop: 'orderWidthTolMin', label: '订货宽度公差下限' },
  { prop: 'specialLen1Eng', label: '特殊英制长度1' },
  { prop: 'shippingMarkB', label: '小唛头2' },
  { prop: 'pieceWt', label: '单件重量' },
  { prop: 'trapeziumBottomlength', label: '梯形下底长' },
  { prop: 'mark1', label: '唛头1' },
  { prop: 'rainCoatFlag', label: '加盖雨布标志' },
  { prop: 'markTypeCode', label: '标记（唛头）类型代码' },
  {
    prop: 'orderStatus',
    label: '合同状态',
    editable: true,
    editorType: 'select',
    editorOptions: [
      { label: '已生效', value: 'active' },
      { label: '已作废', value: 'cancelled' },
      { label: '草稿', value: 'draft' }
    ]
  },
  { prop: 'detectStdCode', label: '探伤标准代码' },
  { prop: 'wtPerMeter', label: '米重' },
  { prop: 'consigneeEname', label: '收货单位英文名称' },
  { prop: 'settleModeName', label: '结算方式名称' },
  { prop: 'tradeModeCode', label: '贸易方式代码' },
  { prop: 'saleOrgCode', label: '销售组织机构代码' },
  { prop: 'salerCompanyCode', label: '卖方公司代码' },
  { prop: 'heatCoatCode', label: '热处理及涂层代码' },
  { prop: 'shippingMark2', label: '大唛头2' },
  { prop: 'bandOriginCode6', label: '供料来源代码6' },
  { prop: 'specialLen2', label: '特殊长度2' },
  { prop: 'tcPrintMode', label: '质保书打印方式' },
  { prop: 'orderEngLenMin', label: '订货英制长度最小' },
  { prop: 'orderOudmEng', label: '英制订货外径' },
  { prop: 'outerPlateO5Flag', label: '外板/O5标识' },
  { prop: 'newProductFlag', label: '新产品标志' },
  { prop: 'depthLeaderDesc', label: '高端/领先描述' },
  { prop: 'terminalCountryName', label: '终到站港国名称' },
  { prop: 'trimType', label: '边缘状态' },
  { prop: 'orderThickTolMin', label: '订货厚度公差下限' },
  { prop: 'color3', label: '色标颜色3' },
  { prop: 'orderNo', label: '合同号' },
  { prop: 'smokeFlag', label: '熏蒸标志' },
  { prop: 'orderModiRemark', label: '合同变更备注' },
  { prop: 'markTypeDesc', label: '标记（唛头）类型说明' },
  { prop: 'orgCoilCode', label: '原板（卷）代码' },
  { prop: 'selfProductFlag', label: '合资/自主品牌标识' },
  { prop: 'thickOffsetNum', label: '厚度偏移量' },
  { prop: 'supervisionMode', label: '监造方式' },
  { prop: 'checkClassificationSocietyCode', label: '双检/联检船级社代码' },
  { prop: 'orderMatNum', label: '订货根数' },
  { prop: 'deliveryPlaceCode', label: '终到站港代码（首端交货地）' },
  { prop: 'shortSizeMax', label: '短尺上限' },
  { prop: 'shotPaintCode', label: '抛丸涂漆代码' },
  { prop: 'sectionFlag', label: '分段标识' },
  { prop: 'orderProcFlag', label: '合同处理标志' },
  { prop: 'staggerCt', label: '错边卷取' },
  { prop: 'orderProcTime', label: '合同处理时间' },
  { prop: 'sgStdWithVersion', label: '牌号标准（含版本）' },
  { prop: 'baseDiv', label: '基地代码' },
  { prop: 'stdCode', label: '标准代码' },
  { prop: 'orderWt', label: '订货重量', editable: true, editorType: 'number', required: '订货重量不能为空' },
  { prop: 'contractNo', label: '合约号' },
  { prop: 'delivySiteCode', label: '交货地点代码' },
  { prop: 'privateRailwayFullName', label: '专用线全称' },
  { prop: 'sgClassCode', label: '牌号分类代码' },
  { prop: 'sleeveType', label: '套筒类型' },
  { prop: 'slabCleanReq', label: '铸坯清理要求' },
  { prop: 'trapeziumToplength', label: '梯形上底长' },
  { prop: 'partId', label: '零部件ID' },
  { prop: 'signCode2', label: '副钢级代码2' },
  { prop: 'labelRemarkDesc', label: '标签备注描述' },
  { prop: 'orderClassificationSocietyCode', label: '订货船级社代码' },
  { prop: 'checkClassificationSocietyDesc', label: '双检/联检船级社描述' },
  { prop: 'wtMode', label: '计重方式' },
  { prop: 'delivyDatePeriod', label: '交货日期期别' },
  { prop: 'nomTimLenTolPlus', label: '额定最终产品单倍尺长度正公差' },
  { prop: 'nomTimLenTolMinus', label: '额定最终产品单倍尺长度负公差' },
  { prop: 'shippingMark8', label: '大唛头8' },
  { prop: 'bandProdCode3', label: '供料品种代码3' },
  { prop: 'bandProdCode6', label: '供料品种代码6' },
  { prop: 'settleUserName', label: '结算用户名称' },
  { prop: 'ceritType', label: '证书类型' },
  { prop: 'manuRemark', label: '制造备注' },
  { prop: 'checkSignCode', label: '双检/联检标记代码' },
  { prop: 'psrCode', label: '产品规范码' },
  { prop: 'packTypeEname', label: '包装类型描述(英文)' },
  { prop: 'orderWidth', label: '订货宽度' },
  { prop: 'shippingPos', label: '唛头重量打印位置1' },
  { prop: 'slabPosReqCode', label: '位置坯要求代码' },
  { prop: 'engiProjectCode', label: '工程代码' },
  { prop: 'pjTypeCode', label: '票夹类型代码' },
  { prop: 'orderUnitEname', label: '订货计量单位英文' },
  { prop: 'sgStd', label: '标准' },
  { prop: 'delivyDate', label: '发货日期' },
  { prop: 'strategProdCode', label: '战略产品代码' },
  { prop: 'strategProdDesc', label: '战略产品描述' },
  { prop: 'sgCode', label: '钢牌号代码' },
  { prop: 'trapezoidHeight', label: '梯形高度' },
  { prop: 'certiNotes', label: '质保书备注' },
  { prop: 'prflModelId', label: '异型材型号标识' },
  { prop: 'oldOrderNo', label: '原合同号' },
  { prop: 'btShotFlag', label: '板坯抛丸要否' },
  { prop: 'rhFlag', label: 'RH登记标识' },
  { prop: 'hotRollMatFlag', label: '烫辊材标记' },
  { prop: 'ifCool', label: '是否缓冷' },
  { prop: 'ifStraigh', label: '是否矫直' },
  { prop: 'ifInverted', label: '是否倒棱' },
  { prop: 'separPileFale', label: '单独堆放' },
  { prop: 'nmagnetHoistFlag', label: '无磁吊装' },
  { prop: 'detectFale', label: '是否探伤' },
  { prop: 'settleMethodCode', label: '结算模式' },
  { prop: 'settleMethodName', label: '结算模式名称' },
  { prop: 'days', label: '天数' },
  { prop: 'specShortSizeRateMax', label: '单规格短尺率上限' },
  { prop: 'orderShortSizeRateMax', label: '全合同综合短尺率上限' },
  { prop: 'onePackWtMax', label: '单捆重量上限' },
  { prop: 'packThreadNumSpecial', label: '打包线道数特殊要求' },
  { prop: 'oneNumSpecial', label: '单捆支数特殊要求' },
  { prop: 'sbodyPaintMarkColor', label: '钢体喷漆标记颜色' },
  { prop: 'shortSizeFlagPack', label: '短尺是否单独打包' },
  { prop: 'oneLabelNum', label: '单捆标牌数量' },
  { prop: 'networkCode', label: '渠道细分类代码' },
  { prop: 'networkName', label: '渠道细分类名称' },
  { prop: 'lenDivCode', label: '长度区分代码' },
  { prop: 'endTime', label: '结束时间' },
  { prop: 'startTime', label: '开始时间' }
]


// ================= 工具函数 =================

/**
 * 判断对象是否为 ContractItem 类型
 */
const isContractItem = (value: unknown): value is ContractItem => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const source = value as Record<string, unknown>
  return 'orderNo' in source || 'saleOrderNo' in source || 'contractNo' in source
}

/**
 * 规范化后端返回的合同列表数据，兼容多种结构
 */
const normalizeContractList = (payload: unknown): ContractItem[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isContractItem)
  }
  if (!payload || typeof payload !== 'object') {
    return []
  }
  const source = payload as Record<string, unknown>
  const candidateKeys = ['records', 'rows', 'list', 'items', 'result', 'data']
  for (const key of candidateKeys) {
    const candidate = source[key]
    if (Array.isArray(candidate)) {
      return candidate.filter(isContractItem)
    }
  }
  if (isContractItem(source)) {
    return [source]
  }
  return []
}

/**
 * 判断对象是否为分页响应结构
 */
const isPageResponse = <T,>(payload: unknown): payload is PageResponse<T> => {
  if (!payload || typeof payload !== 'object') {
    return false
  }
  const source = payload as Record<string, unknown>
  return 'records' in source || 'total' in source || 'current' in source || 'size' in source
}

/**
 * 从 query.queryTimeRange 拆分出 startTime、endTime
 */
const syncQueryTimeRange = () => {
  if (Array.isArray(query.queryTimeRange) && query.queryTimeRange.length === 2) {
    return {
      startTime: query.queryTimeRange[0],
      endTime: query.queryTimeRange[1]
    }
  }
  return {
    startTime: '',
    endTime: ''
  }
}

/**
 * 构建查询参数对象，供接口请求使用
 */
const buildQueryParams = () => {
  const { startTime, endTime } = syncQueryTimeRange()
  return {
    orderNo: query.orderNo,
    saleOrderNo: query.saleOrderNo,
    contractNo: query.contractNo,
    orderCustCode: query.orderCustCode,
    orderCustCname: query.orderCustCname,
    orderStatus: query.orderStatus,
    orderTypeCode: query.orderTypeCode,
    prodClassCode: query.prodClassCode,
    prodCode: query.prodCode,
    companyCode: query.companyCode,
    saleOrgCode: query.saleOrgCode,
    startTime,
    endTime
  }
}

// ================= 数据请求与处理 =================

/**
 * 查询合同数据，支持分页参数
 */
const handleQuery = async (options?: { currentPage?: number; pageSize?: number }) => {
  loading.querying = true
  try {
    // 设置分页参数
    if (typeof options?.currentPage === 'number' && Number.isFinite(options.currentPage) && options.currentPage > 0) {
      requestPageState.currentPage = options.currentPage
    }
    if (typeof options?.pageSize === 'number' && Number.isFinite(options.pageSize) && options.pageSize > 0) {
      requestPageState.pageSize = options.pageSize
    }

    const pageBody = {
      current: requestPageState.currentPage,
      size: requestPageState.pageSize
    }

    // 发起接口请求
    const result = await post<unknown>('/om/query', pageBody, {
      params: buildQueryParams()
    })

    // 兼容分页与非分页结构
    if (isPageResponse<ContractItem>(result)) {
      tableData.value = Array.isArray(result.records)
        ? result.records.filter(isContractItem)
        : normalizeContractList(result)
      serverTotal.value = Number(result.total ?? tableData.value.length)
      return
    }
    tableData.value = normalizeContractList(result)
    serverTotal.value = tableData.value.length
  } catch (error) {
    tableData.value = []
    serverTotal.value = 0
    ElMessage.error(getErrorMessage(error, '合同查询失败，请检查接口或参数'))
  } finally {
    loading.querying = false
  }
}

// ================= 交互方法 =================

const getRowBusinessKey = (row: ContractItem) => row.orderNo || row.contractNo || row.saleOrderNo || ''

const sanitizeRow = (row: ContractItem) => {
  const { __commonTableRowKey, __commonTableSelection, ...rest } = row as ContractItem & {
    __commonTableRowKey?: string
    __commonTableSelection?: boolean
  }
  return { ...rest }
}

const handleSelectionChange = (payload: { rows: ContractItem[]; keys: Array<string | number | undefined> }) => {
  selectedRows.value = payload.rows
  selectedKeys.value = payload.keys
}

const handleEditCellChange = (payload: {
  field: string
  row: ContractItem
  applyPatch: (patch: Record<string, unknown>) => void
}) => {
  if (payload.field === 'prodCode') {
    const prodNameMap: Record<string, string> = {
      rebar: '螺纹钢',
      hotroll: '热轧卷',
      aluminum: '铝锭'
    }
    payload.applyPatch({ prodCname: prodNameMap[String(payload.row.prodCode ?? '')] ?? '' })
  }

  if (payload.field === 'orderQty' || payload.field === 'orderWt') {
    const quantity = Number(payload.row.orderQty ?? 0)
    const weight = Number(payload.row.orderWt ?? 0)
    payload.applyPatch({ days: quantity > 0 ? Math.max(1, Math.round(weight / Math.max(quantity, 1))) : 0 })
  }
}

const handleEditSubmit = (payload: { rows: ContractItem[] }) => {
  const patchMap = new Map(payload.rows.map((row) => [getRowBusinessKey(row), sanitizeRow(row)]))
  tableData.value = tableData.value.map((row) => {
    const businessKey = getRowBusinessKey(row)
    return patchMap.has(businessKey) ? { ...row, ...patchMap.get(businessKey) } : row
  })
  ElMessage.success(`已提交 ${payload.rows.length} 条编辑数据`)
}

const handleCreateSubmit = (payload: { rows: ContractItem[] }) => {
  tableData.value = [...tableData.value, ...payload.rows.map((row) => sanitizeRow(row))]
  serverTotal.value = tableData.value.length
  ElMessage.success(`已新增 ${payload.rows.length} 条数据`)
}

const handleDeleteSubmit = (payload: { keys: Array<string | number | undefined> }) => {
  const keySet = new Set(payload.keys.map((key) => String(key ?? '')))
  tableData.value = tableData.value.filter((row) => !keySet.has(String(row.orderNo ?? '')))
  serverTotal.value = tableData.value.length
  selectedRows.value = []
  selectedKeys.value = []
  ElMessage.success(`已提交 ${payload.keys.length} 条删除请求`)
}

const startEditMode = () => {
  operationMode.value = 'edit'
}

const startCreateMode = () => {
  operationMode.value = 'create'
}

const startDeleteMode = () => {
  operationMode.value = 'delete'
}

const confirmCurrentAction = async () => {
  const result = await commonTableRef.value?.confirmPendingChanges?.()
  if (result) {
    operationMode.value = 'idle'
  } else {
    ElMessage.warning('请先完成必填项或修正校验错误')
  }
}

const cancelCurrentAction = () => {
  commonTableRef.value?.cancelPendingChanges?.()
  operationMode.value = 'idle'
}

/**
 * 重置查询条件并重置分页
 */
const resetQuery = () => {
  query.orderNo = ''
  query.saleOrderNo = ''
  query.contractNo = ''
  query.orderCustCode = ''
  query.orderCustCname = ''
  query.orderStatus = ''
  query.orderTypeCode = ''
  query.prodClassCode = ''
  query.prodCode = ''
  query.companyCode = ''
  query.saleOrgCode = ''
  query.queryTimeRange = []
  commonTableRef.value?.resetPagination()
}

/**
 * 查询按钮点击，重置分页到第一页
 */
const handleSearchSubmit = () => {
  commonTableRef.value?.resetPagination()
}

/**
 * 分页变化时触发，带上新分页参数重新查询
 */
const handlePaginationChange = (payload: { currentPage: number; pageSize: number; reason: 'page' | 'size' | 'reset' }) => {
  handleQuery({
    currentPage: payload.currentPage,
    pageSize: payload.pageSize
  })
}

</script>

<style scoped>
.contract-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.query-form {
  margin-bottom: 0;
}

:v-deep(.query-form .el-form-item) {
  margin-bottom: 8px;
}

:v-deep(.query-form .el-form-item__label) {
  white-space: nowrap;
  justify-content: flex-start;
  text-align: left;
  width: auto;
  min-width: 0;
}

:v-deep(.query-form .el-form-item__content) {
  min-width: 0;
}

:v-deep(.query-form .el-input),
:v-deep(.query-form .el-select),
:v-deep(.query-form .el-date-editor) {
  width: 100%;
}

:v-deep(.query-form .el-date-editor.el-input__wrapper) {
  width: 100%;
}

:v-deep(.query-form .el-input__wrapper),
:v-deep(.query-form .el-select__wrapper) {
  min-width: 0;
}

.table-wrap {
  flex: 1;
  min-height: 0;
}

.query-action-bar {
  padding: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.query-action-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.query-action-left,
.query-action-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-toolbar-summary {
  color: #606266;
  font-size: 12px;
  white-space: nowrap;
}
</style>
