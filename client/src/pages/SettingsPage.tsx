import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Stack,
  Typography,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Slider,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import { useSnackbar } from "notistack";
import { CHUNK_SIZE_LADDER } from "@p2p/shared";
import { useSettingsStore, type AppearanceMode } from "../stores/useSettingsStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { clearAllTemporaryData } from "../services/storage/db";
import { detectDeviceLabel } from "../services/device/deviceInfo";
import { formatBytes } from "../utils/format";

interface DeviceNameForm {
  deviceName: string;
}

export function SettingsPage() {
  const settings = useSettingsStore();
  const { clear: clearHistory } = useHistoryStore();
  const { enqueueSnackbar } = useSnackbar();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm<DeviceNameForm>({
    defaultValues: { deviceName: settings.deviceName || detectDeviceLabel() },
  });

  useEffect(() => {
    reset({ deviceName: settings.deviceName || detectDeviceLabel() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveDeviceName = (data: DeviceNameForm) => {
    const trimmed = data.deviceName.trim().slice(0, 64);
    settings.setDeviceName(trimmed || detectDeviceLabel());
    enqueueSnackbar("Device name saved", { variant: "success" });
  };

  return (
    <Stack spacing={4}>
      <Typography variant="h4">Settings</Typography>

      <Stack spacing={1.5}>
        <Typography variant="h6">Appearance</Typography>
        <ToggleButtonGroup
          exclusive
          value={settings.appearance}
          onChange={(_, value: AppearanceMode | null) => value && settings.setAppearance(value)}
        >
          <ToggleButton value="light">
            <LightModeIcon sx={{ mr: 1 }} fontSize="small" /> Light
          </ToggleButton>
          <ToggleButton value="dark">
            <DarkModeIcon sx={{ mr: 1 }} fontSize="small" /> Dark
          </ToggleButton>
          <ToggleButton value="system">
            <SettingsBrightnessIcon sx={{ mr: 1 }} fontSize="small" /> System
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Divider />

      <Stack spacing={1.5} component="form" onSubmit={handleSubmit(onSaveDeviceName)}>
        <Typography variant="h6">Device Name</Typography>
        <Stack direction="row" spacing={1.5}>
          <TextField
            {...register("deviceName", { maxLength: 64 })}
            size="small"
            fullWidth
            sx={{ maxWidth: 320 }}
          />
          <Button type="submit" variant="outlined">
            Save
          </Button>
        </Stack>
      </Stack>

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="h6">Transfer</Typography>
        <FormControlLabel
          control={<Switch checked={settings.autoResume} onChange={(e) => settings.setAutoResume(e.target.checked)} />}
          label="Auto Resume interrupted transfers"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.confirmIncomingTransfers}
              onChange={(e) => settings.setConfirmIncomingTransfers(e.target.checked)}
            />
          }
          label="Confirm incoming transfers before accepting"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.applicationEncryption}
              onChange={(e) => settings.setApplicationEncryption(e.target.checked)}
            />
          }
          label="Application-level encryption (AES-GCM, in addition to WebRTC's transport encryption)"
        />
      </Stack>

      <Accordion expanded={advancedOpen} onChange={(_, exp) => setAdvancedOpen(exp)} disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Advanced</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="body2">Chunk Size</Typography>
              <Select
                size="small"
                value={settings.chunkSize}
                onChange={(e) => settings.setChunkSize(Number(e.target.value))}
                sx={{ maxWidth: 200 }}
              >
                {CHUNK_SIZE_LADDER.map((size) => (
                  <MenuItem key={size} value={size}>
                    {formatBytes(size)}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">
                Larger chunks reduce overhead on fast networks; smaller chunks keep progress smoother on slow ones.
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="body2">Session Timeout: {Math.round(settings.sessionTimeoutSeconds / 60)} minutes</Typography>
              <Box sx={{ maxWidth: 320 }}>
                <Slider
                  value={settings.sessionTimeoutSeconds}
                  min={600}
                  max={3600}
                  step={300}
                  marks={[
                    { value: 600, label: "10m" },
                    { value: 1800, label: "30m" },
                    { value: 3600, label: "1h" },
                  ]}
                  onChange={(_, value) => settings.setSessionTimeoutSeconds(value as number)}
                />
              </Box>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="h6">Privacy</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={async () => {
              await clearHistory();
              enqueueSnackbar("History cleared", { variant: "success" });
            }}
          >
            Clear History
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={async () => {
              await clearAllTemporaryData();
              enqueueSnackbar("Temporary data cleared", { variant: "success" });
            }}
          >
            Clear Temporary Data
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          P2P File Share never uploads your files to a server. Session metadata (device name,
          session id) is held only in memory and expires automatically — see the Privacy page for
          details.
        </Typography>
      </Stack>
    </Stack>
  );
}
