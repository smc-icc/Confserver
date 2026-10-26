<template>
  <div class="smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.vdnadmin.basicInfo.title') }}</h2>
    <p class="desc">
      {{ $t('smcicc.vdnadmin.basicInfo.desc') }}
    </p>
    <div class="actions">
      <el-button type="primary" size="small" :loading="loading" @click="load">{{ $t('smcicc.common.refresh') }}</el-button>
      <el-button type="success" size="small" :loading="saving" :disabled="!form.id && form.id !== 0" @click="save">
        {{ $t('smcicc.vdnadmin.basicInfo.saveChanges') }}
      </el-button>
    </div>
    <el-alert v-if="err" :title="err" type="error" show-icon class="mt" :closable="false" />
    <el-form
      v-else-if="form.id != null"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="220px"
      size="small"
      class="vdn-form"
    >
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.vdnId')">
        <el-input :value="form.id" disabled />
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.vdnName')" prop="name">
        <el-input v-model="form.name" maxlength="50" />
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.answerStyle')" prop="answerStyle">
        <el-select v-model="form.answerStyle">
          <el-option :value="0" :label="$t('smcicc.vdnadmin.basicInfo.answerDirect')" />
          <el-option :value="1" :label="$t('smcicc.vdnadmin.basicInfo.answerVoiceWorkNo')" />
          <el-option :value="2" :label="$t('smcicc.vdnadmin.basicInfo.answerTextWorkNo')" />
          <el-option :value="3" :label="$t('smcicc.vdnadmin.basicInfo.answerPublicVoice')" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.callOutCallingNumType')" prop="callOutCallingNumType">
        <el-select v-model="form.callOutCallingNumType">
          <el-option v-for="it in numTypes" :key="'c' + it.id" :value="it.id" :label="it.text" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.callOutCalledNumType')" prop="callOutCalledNumType">
        <el-select v-model="form.callOutCalledNumType">
          <el-option v-for="it in numTypes" :key="'d' + it.id" :value="it.id" :label="it.text" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.callOutCallingNum')" prop="callOutCallingNum">
        <el-input v-model="form.callOutCallingNum" maxlength="50" />
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.maxWaitAnswerTime')" prop="maxWaitAnswerTime">
        <el-input v-model.number="form.maxWaitAnswerTime">
          <template slot="append">{{ $t('smcicc.common.seconds') }}</template>
        </el-input>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.systemVoiceId')" prop="systemVoiceId">
        <el-input v-model.number="form.systemVoiceId">
          <template slot="append">{{ form.voiceName || $t('smcicc.vdnadmin.basicInfo.voiceId') }}</template>
        </el-input>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.startRecord')" prop="startRecord">
        <el-select v-model="form.startRecord">
          <el-option :value="0" :label="$t('smcicc.common.no')" />
          <el-option :value="1" :label="$t('smcicc.common.yes')" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.realTimeSpeechRecog')">
        <el-select v-model="form.realTimeSpeechRecog">
          <el-option :value="0" :label="$t('smcicc.common.no')" />
          <el-option :value="1" :label="$t('smcicc.common.yes')" />
        </el-select>
        <p class="hint">{{ $t('smcicc.vdnadmin.basicInfo.realTimeSpeechRecogHint') }}</p>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.asrEngine')" v-if="Number(form.realTimeSpeechRecog) === 1">
        <el-select v-model="form.asrEngine">
          <el-option value="funasr" label="FunASR" />
          <el-option value="whisper" label="Whisper" />
        </el-select>
        <p class="hint">{{ $t('smcicc.vdnadmin.basicInfo.asrEngineHint') }}</p>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.recordWorkNo')">
        <el-select v-model="form.recordWorkNo" :disabled="Number(form.startRecord) !== 1">
          <el-option :value="0" :label="$t('smcicc.vdnadmin.basicInfo.recordWorkNoNo')" />
          <el-option :value="1" :label="$t('smcicc.vdnadmin.basicInfo.recordWorkNoYes')" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.sipExtStatusSupport')">
        <el-select v-model="form.sipExtStatusSupport">
          <el-option :value="0" :label="$t('smcicc.vdnadmin.basicInfo.sipExtOff')" />
          <el-option :value="1" :label="$t('smcicc.vdnadmin.basicInfo.sipExtOn')" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.cancelQueueDtmf')" prop="cancelQueueDtmf">
        <el-select v-model="form.cancelQueueDtmf" allow-create filterable>
          <el-option v-for="k in dtmfKeys" :key="k" :value="k" :label="k" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('smcicc.vdnadmin.basicInfo.maxAcwTime')" prop="maxAcwTime">
        <el-input v-model.number="form.maxAcwTime">
          <template slot="append">{{ $t('smcicc.common.seconds') }}</template>
        </el-input>
      </el-form-item>
    </el-form>
    <p v-else class="muted">{{ $t('smcicc.vdnadmin.basicInfo.noData') }}</p>
  </div>
</template>

<script>
const BASE = '/server/api/smcicc/vdnadmin';

const NUM_TYPE_IDS = [-1, 0, 1, 2, 3, 4, 7];
const NUM_TYPE_KEYS = {
  [-1]: 'numTypeDefault',
  0: 'numTypeUnknown',
  1: 'numTypeInternational',
  2: 'numTypeNational',
  3: 'numTypeNetwork',
  4: 'numTypeUser',
  7: 'numTypeReserved',
};

export default {
  name: 'SMCIccVdnBasicInfo',
  data() {
    return {
      loading: false,
      saving: false,
      err: '',
      dtmfKeys: ['*', '#', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      form: this.emptyForm(),
    };
  },
  computed: {
    numTypes() {
      return NUM_TYPE_IDS.map((id) => ({
        id,
        text: this.$t(`smcicc.vdnadmin.basicInfo.${NUM_TYPE_KEYS[id]}`),
      }));
    },
    rules() {
      return {
        name: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.nameRequired'), trigger: 'blur' }],
        answerStyle: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.answerStyleRequired'), trigger: 'change' }],
        callOutCallingNumType: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.callOutCallingNumTypeRequired'), trigger: 'change' }],
        callOutCalledNumType: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.callOutCalledNumTypeRequired'), trigger: 'change' }],
        callOutCallingNum: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.callOutCallingNumRequired'), trigger: 'blur' }],
        maxWaitAnswerTime: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.maxWaitAnswerTimeRequired'), trigger: 'blur' }],
        systemVoiceId: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.systemVoiceIdRequired'), trigger: 'blur' }],
        startRecord: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.startRecordRequired'), trigger: 'change' }],
        cancelQueueDtmf: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.cancelQueueDtmfRequired'), trigger: 'change' }],
        maxAcwTime: [{ required: true, message: this.$t('smcicc.vdnadmin.basicInfo.maxAcwTimeRequired'), trigger: 'blur' }],
      };
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    emptyForm() {
      return {
        id: null,
        name: '',
        parentId: -1,
        cancelQueueDtmf: '',
        maxWaitAnswerTime: null,
        maxAcwTime: null,
        callOutCallingNum: '',
        answerStyle: null,
        systemVoiceId: null,
        voiceName: '',
        startRecord: 0,
        realTimeSpeechRecog: 0,
        asrEngine: 'funasr',
        recordWorkNo: 0,
        sipExtStatusSupport: 0,
        callOutCallingNumType: -1,
        callOutCalledNumType: -1,
      };
    },
    applyRow(data) {
      const row = data && typeof data === 'object' ? data : {};
      this.form = {
        ...this.emptyForm(),
        ...row,
        startRecord: row.startRecord != null ? Number(row.startRecord) : 0,
        realTimeSpeechRecog: row.realTimeSpeechRecog != null ? Number(row.realTimeSpeechRecog) : 0,
        asrEngine: (['funasr', 'whisper'].includes(String(row.asrEngine || ''))
          ? String(row.asrEngine)
          : 'funasr'),
        recordWorkNo: row.recordWorkNo != null ? Number(row.recordWorkNo) : 0,
        sipExtStatusSupport: row.sipExtStatusSupport != null ? Number(row.sipExtStatusSupport) : 0,
        answerStyle: row.answerStyle != null ? Number(row.answerStyle) : null,
        callOutCallingNumType: row.callOutCallingNumType != null ? Number(row.callOutCallingNumType) : -1,
        callOutCalledNumType: row.callOutCalledNumType != null ? Number(row.callOutCalledNumType) : -1,
      };
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .getJSON(`${BASE}/loadBasicInfo`)
        .then((data) => {
          if (!data || data.id == null) {
            this.err = this.$t('smcicc.vdnadmin.basicInfo.loadEmpty');
            this.form = this.emptyForm();
            return;
          }
          this.applyRow(data);
        })
        .catch(() => {
          this.err = this.$t('smcicc.vdnadmin.basicInfo.requestFailed');
          this.form = this.emptyForm();
        })
        .finally(() => {
          this.loading = false;
        });
    },
    save() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        this.saving = true;
        const payload = {
          id: this.form.id,
          name: (this.form.name || '').trim(),
          cancelQueueDtmf: this.form.cancelQueueDtmf,
          maxWaitAnswerTime: this.form.maxWaitAnswerTime,
          maxAcwTime: this.form.maxAcwTime,
          callOutCallingNum: this.form.callOutCallingNum,
          answerStyle: this.form.answerStyle,
          systemVoiceId: this.form.systemVoiceId,
          startRecord: Number(this.form.startRecord) ? 1 : 0,
          realTimeSpeechRecog: Number(this.form.realTimeSpeechRecog) ? 1 : 0,
          asrEngine: (['funasr', 'whisper'].includes(String(this.form.asrEngine || ''))
            ? String(this.form.asrEngine)
            : 'funasr'),
          recordWorkNo: Number(this.form.startRecord) === 1 && Number(this.form.recordWorkNo) ? 1 : 0,
          sipExtStatusSupport: Number(this.form.sipExtStatusSupport) ? 1 : 0,
          callOutCallingNumType: this.form.callOutCallingNumType,
          callOutCalledNumType: this.form.callOutCalledNumType,
        };
        this.$ajax
          .postJSON(`${BASE}/modifyBasicInfo`, { vdnjson: payload })
          .then((okSave) => {
            if (okSave) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.load();
            } else {
              this.$message.warning(this.$t('smcicc.common.saveFailed'));
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
  },
};
</script>

<style scoped>
.page-title {
  font-size: 20px;
  margin: 0 0 8px;
}
.desc {
  color: #606266;
  margin-bottom: 12px;
}
.actions {
  margin-bottom: 12px;
}
.mt {
  margin-top: 16px;
}
.vdn-form {
  max-width: 640px;
  margin-top: 8px;
}
.vdn-form /deep/ .el-select,
.vdn-form /deep/ .el-input {
  width: 360px;
}
.hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
.muted {
  color: #909399;
  margin-top: 16px;
}
</style>
