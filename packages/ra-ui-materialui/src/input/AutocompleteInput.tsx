import {
    Autocomplete,
    type AutocompleteChangeReason,
    type AutocompleteCloseReason,
    type AutocompleteProps,
    Chip,
    createFilterOptions,
    TextField,
    type TextFieldProps,
    major as muiMajor,
    useForkRef,
} from '@mui/material';
import {
    type ComponentsOverrides,
    styled,
    useThemeProps,
    Theme,
} from '@mui/material/styles';
import clsx from 'clsx';
import debounce from 'lodash/debounce.js';
import get from 'lodash/get.js';
import isEqual from 'lodash/isEqual.js';
import {
    type ChoicesProps,
    FieldTitle,
    type RaRecord,
    type SupportCreateSuggestionOptions,
    useChoicesContext,
    useEvent,
    useGetRecordRepresentation,
    useInput,
    useSuggestions,
    type UseSuggestionsOptions,
    useSupportCreateSuggestion,
    useTimeout,
    useTranslate,
    warning,
} from 'ra-core';
import * as React from 'react';
import {
    isValidElement,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Offline } from '../Offline';
import type { CommonInputProps } from './CommonInputProps';
import { InputHelperText } from './InputHelperText';
import { sanitizeInputRestProps } from './sanitizeInputRestProps';

const defaultFilterOptions = createFilterOptions();

export const AutocompleteInput = <
    OptionType extends RaRecord = RaRecord,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = boolean | undefined,
    SupportCreate extends boolean | undefined = false,
>(
    inProps: AutocompleteInputProps<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >
) => {
    const props = useThemeProps({
        props: inProps,
        name: PREFIX,
    });
    const {
        choices: choicesProp,
        className,
        clearOnBlur = true,
        clearText = 'ra.action.clear_input_value',
        closeText = 'ra.action.close',
        create,
        createLabel,
        createItemLabel = 'ra.action.create_item',
        createValue,
        createHintValue,
        debounce: debounceDelay = 250,
        defaultValue,
        emptyText,
        emptyValue = '',
        field: fieldOverride,
        format,
        helperText,
        id: idOverride,
        inputText,
        isFetching: isFetchingProp,
        isLoading: isLoadingProp,
        isPending: isPendingProp,
        isRequired: isRequiredOverride,
        label,
        limitChoicesToValue,
        loadingText = 'ra.message.loading',
        matchSuggestion,
        margin,
        fieldState: fieldStateOverride,
        filterToQuery: filterToQueryProp = DefaultFilterToQuery,
        formState: formStateOverride,
        multiple = false,
        noOptionsText,
        offline = defaultOffline,
        onBlur,
        onChange,
        onClose: onCloseProp,
        onCreate,
        onOpen: onOpenProp,
        openText = 'ra.action.open',
        optionText,
        optionValue,
        parse,
        resource: resourceProp,
        shouldRenderSuggestions,
        setFilter,
        size,
        source: sourceProp,
        suggestionLimit = Infinity,
        TextFieldProps,
        translateChoice,
        validate,
        variant,
        onInputChange,
        disabled,
        readOnly,
        getOptionDisabled: getOptionDisabledProp,
        ...rest
    } = props;

    const filterToQuery = useEvent(filterToQueryProp);

    const {
        allChoices,
        isPaused,
        isPending,
        isPlaceholderData,
        error: fetchError,
        resource,
        source,
        setFilters,
        isFromReference,
    } = useChoicesContext({
        choices: choicesProp,
        isFetching: isFetchingProp,
        isLoading: isLoadingProp,
        isPending: isPendingProp,
        resource: resourceProp,
        source: sourceProp,
    });

    const translate = useTranslate();

    const {
        id,
        field,
        isRequired,
        fieldState: { error, invalid },
    } = useInput({
        defaultValue,
        id: idOverride,
        field: fieldOverride,
        fieldState: fieldStateOverride,
        formState: formStateOverride,
        isRequired: isRequiredOverride,
        onBlur,
        onChange,
        parse,
        format,
        resource,
        source,
        validate,
        disabled,
        readOnly,
        ...rest,
    });

    const finalChoices = useMemo(
        () =>
            emptyText == undefined || isRequired || multiple
                ? allChoices
                : [
                      {
                          [optionValue || 'id']: emptyValue,
                          [typeof optionText === 'string'
                              ? optionText
                              : 'name']: translate(emptyText, {
                              _: emptyText,
                          }),
                      },
                  ].concat(allChoices || []),
        [
            allChoices,
            emptyValue,
            emptyText,
            isRequired,
            multiple,
            optionText,
            optionValue,
            translate,
        ]
    );

    const selectedChoice = useSelectedChoice<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >(field.value, {
        choices: finalChoices,
        // @ts-ignore
        multiple,
        optionValue,
    });

    useEffect(() => {
        if (emptyValue == null) {
            throw new Error(
                `emptyValue being set to null or undefined is not supported. Use parse to turn the empty string into null.`
            );
        }
    }, [emptyValue]);

    useEffect(() => {
        if (isValidElement(optionText) && emptyText != undefined) {
            throw new Error(
                `optionText of type React element is not supported when setting emptyText`
            );
        }
        if (isValidElement(optionText) && inputText == undefined) {
            throw new Error(`
If you provided a React element for the optionText prop, you must also provide the inputText prop (used for the text input)`);
        }
        if (
            isValidElement(optionText) &&
            !isFromReference &&
            matchSuggestion == undefined
        ) {
            throw new Error(`
If you provided a React element for the optionText prop, you must also provide the matchSuggestion prop (used to match the user input with a choice)`);
        }
    }, [optionText, inputText, matchSuggestion, emptyText, isFromReference]);

    useEffect(() => {
        warning(
            /* eslint-disable eqeqeq */
            shouldRenderSuggestions != undefined && noOptionsText == undefined,
            `When providing a shouldRenderSuggestions function, we recommend you also provide the noOptionsText prop and set it to a text explaining users why no options are displayed. It supports translation keys.`
        );
        /* eslint-enable eqeqeq */
    }, [shouldRenderSuggestions, noOptionsText]);

    const getRecordRepresentation = useGetRecordRepresentation(resource);

    const { getChoiceText, getChoiceValue, getSuggestions } = useSuggestions({
        choices: finalChoices,
        limitChoicesToValue,
        matchSuggestion,
        optionText:
            optionText ??
            (isFromReference ? getRecordRepresentation : undefined),
        optionValue,
        createValue,
        createHintValue,
        selectedItem: selectedChoice,
        suggestionLimit,
        translateChoice: translateChoice ?? !isFromReference,
    });

    const [filterValue, setFilterValue] = useState('');

    const [isOpen, setIsOpen] = useState(false);
    const canRenderSuggestions =
        shouldRenderSuggestions == undefined ||
        shouldRenderSuggestions(filterValue);

    const handleOpen = useEvent((event: React.SyntheticEvent) => {
        setIsOpen(true);
        onOpenProp?.(event);
    });

    const handleClose = useEvent(
        (event: React.SyntheticEvent, reason: AutocompleteCloseReason) => {
            setIsOpen(false);
            onCloseProp?.(event, reason);
        }
    );

    const handleChange = useEvent((newValue: any) => {
        if (multiple) {
            if (Array.isArray(newValue)) {
                field.onChange(newValue.map(getChoiceValue), newValue);
            } else {
                field.onChange(
                    [...(field.value ?? []), getChoiceValue(newValue)],
                    newValue
                );
            }
        } else {
            field.onChange(getChoiceValue(newValue) ?? emptyValue, newValue);
        }
    });

    const debouncedSetFilter = useCallback(
        debounce(filter => {
            if (setFilter) {
                return setFilter(filter);
            }

            if (choicesProp) {
                return;
            }

            setFilters(filterToQuery(filter));
        }, debounceDelay),
        [debounceDelay, setFilters, setFilter]
    );

    const currentValue = useRef(field.value);
    useEffect(() => {
        if (!isEqual(currentValue.current, field.value)) {
            currentValue.current = field.value;
            debouncedSetFilter('');
        }
    }, [field.value]);

    const {
        getCreateItem,
        handleChange: handleChangeWithCreateSupport,
        createElement,
        createId,
        getOptionDisabled: getOptionDisabledWithCreateSupport,
    } = useSupportCreateSuggestion({
        create,
        createLabel,
        createItemLabel,
        createValue,
        createHintValue,
        handleChange,
        filter: filterValue,
        onCreate,
        optionText,
    });

    const getOptionDisabled = useCallback(
        option => {
            return (
                getOptionDisabledWithCreateSupport(option) ||
                (getOptionDisabledProp && getOptionDisabledProp(option))
            );
        },
        [getOptionDisabledProp, getOptionDisabledWithCreateSupport]
    );

    const getOptionLabel = useCallback(
        (option: any, isListItem: boolean = false) => {
            if (option == undefined) {
                return '';
            }

            if (typeof option === 'string') {
                return option;
            }

            if (option?.id === createId) {
                return get(
                    option,
                    typeof optionText === 'string' ? optionText : 'name'
                );
            }

            if (!isListItem && option[optionValue || 'id'] === emptyValue) {
                return get(
                    option,
                    typeof optionText === 'string' ? optionText : 'name'
                );
            }

            if (!isListItem && inputText !== undefined) {
                return inputText(option);
            }

            return getChoiceText(option);
        },
        [
            getChoiceText,
            inputText,
            createId,
            optionText,
            optionValue,
            emptyValue,
        ]
    );
    const getOptionLabelString = useCallback(
        (option: any, isListItem: boolean = false) => {
            const optionLabel = getOptionLabel(option, isListItem);
            return typeof optionLabel === 'string' ? optionLabel : '';
        },
        [getOptionLabel]
    );

    const finalOnBlur = useCallback(
        (event): void => {
            if (clearOnBlur && !multiple) {
                const optionLabel = getOptionLabel(selectedChoice);
                if (!isEqual(optionLabel, filterValue)) {
                    setFilterValue(optionLabel);
                    debouncedSetFilter('');
                }
            }
            field.onBlur(event);
        },
        [
            clearOnBlur,
            field,
            getOptionLabel,
            selectedChoice,
            filterValue,
            debouncedSetFilter,
            multiple,
        ]
    );

    useEffect(() => {
        if (!multiple) {
            const optionLabel = getOptionLabel(selectedChoice);
            if (typeof optionLabel === 'string') {
                setFilterValue(optionLabel);
            } else {
                throw new Error(
                    'When optionText returns a React element, you must also provide the inputText prop'
                );
            }
        }
    }, [getOptionLabel, multiple, selectedChoice]);

    const handleInputChange: AutocompleteProps<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >['onInputChange'] = useEvent((event, newInputValue, reason) => {
        if (
            event?.type === 'change' ||
            !doesQueryMatchSelection(newInputValue)
        ) {
            const createOptionLabel =
                typeof createItemLabel === 'string'
                    ? translate(createItemLabel, {
                          item: filterValue,
                          _: createItemLabel,
                      })
                    : undefined;
            const isCreate = newInputValue === createOptionLabel;
            const valueToSet = isCreate ? filterValue : newInputValue;
            setFilterValue(valueToSet);
            debouncedSetFilter(newInputValue);
        }
        if (reason === 'clear') {
            setFilterValue('');
            debouncedSetFilter('');
        }
        if (
            reason === 'reset' &&
            event !== null &&
            doesQueryMatchSelection(newInputValue)
        ) {
            setFilterValue(newInputValue);
            debouncedSetFilter('');
        }
        onInputChange?.(event, newInputValue, reason);
    });

    const doesQueryMatchSelection = useCallback(
        (filter: string) => {
            let selectedItemTexts;

            if (multiple) {
                selectedItemTexts = selectedChoice.map(item =>
                    getOptionLabel(item)
                );
            } else {
                selectedItemTexts = [getOptionLabel(selectedChoice)];
            }

            return selectedItemTexts.includes(filter);
        },
        [getOptionLabel, multiple, selectedChoice]
    );
    const doesQueryMatchSuggestion = useCallback(
        filter => {
            const hasOption = finalChoices
                ? finalChoices.some(choice => getOptionLabel(choice) === filter)
                : false;

            return doesQueryMatchSelection(filter) || hasOption;
        },
        [finalChoices, getOptionLabel, doesQueryMatchSelection]
    );

    const filterOptions = (options, params) => {
        let filteredOptions =
            isFromReference || matchSuggestion || limitChoicesToValue
                ? options
                : defaultFilterOptions(options, params);

        const { inputValue } = params;
        if (onCreate || create) {
            if (inputValue === '' && filterValue === '' && createLabel) {
                filteredOptions = filteredOptions.concat(getCreateItem(''));
            } else if (
                inputValue &&
                filterValue &&
                !doesQueryMatchSuggestion(filterValue)
            ) {
                filteredOptions = filteredOptions.concat(
                    getCreateItem(inputValue)
                );
            }
        }

        return filteredOptions;
    };

    const handleAutocompleteChange = useCallback(
        (event: any, newValue: any, reason: AutocompleteChangeReason) => {
            event.preventDefault();
            if (reason === 'createOption') {
                handleChangeWithCreateSupport(
                    getCreateItem(
                        Array.isArray(newValue)
                            ? newValue[newValue.length - 1]
                            : newValue
                    )
                );
                return;
            }
            handleChangeWithCreateSupport(
                newValue != null ? newValue : emptyValue
            );
        },
        [emptyValue, getCreateItem, handleChangeWithCreateSupport]
    );

    const oneSecondHasPassed = useTimeout(1000, filterValue);

    const suggestions = useMemo(() => {
        if (!isFromReference && (matchSuggestion || limitChoicesToValue)) {
            return getSuggestions(filterValue);
        }
        return finalChoices?.slice(0, suggestionLimit) || [];
    }, [
        finalChoices,
        filterValue,
        getSuggestions,
        limitChoicesToValue,
        matchSuggestion,
        suggestionLimit,
        isFromReference,
    ]);

    const isOptionEqualToValue = (option, value) => {
        return String(getChoiceValue(option)) === String(getChoiceValue(value));
    };
    const renderHelperText = !!fetchError || helperText !== false || invalid;

    const handleInputRef = useForkRef(field.ref, TextFieldProps?.inputRef);
    if (isPending && isPaused && offline !== false && offline !== undefined) {
        return offline as any;
    }

    const renderChips = (value, getProps: (args: { index: number }) => any) =>
        value.map((option, index) => {
            const { key, ...chipProps } = getProps({ index });
            const mergedSlotProps = props.slotProps?.chip
                ? props.slotProps.chip
                : props.ChipProps;
            return (
                <Chip
                    label={
                        isValidElement(optionText)
                            ? inputText
                                ? inputText(option)
                                : ''
                            : getChoiceText(option)
                    }
                    size="small"
                    key={key}
                    {...chipProps}
                    {...mergedSlotProps}
                />
            );
        });

    const finalLoadingText =
        typeof loadingText === 'string'
            ? translate(loadingText, {
                  _: loadingText,
              })
            : loadingText;
    return (
        <>
            <StyledAutocomplete
                className={clsx('ra-input', `ra-input-${source}`, className)}
                clearText={translate(clearText, { _: clearText })}
                closeText={translate(closeText, { _: closeText })}
                loadingText={
                    isPaused && isPlaceholderData
                        ? offline !== false && offline !== undefined
                            ? offline
                            : finalLoadingText
                        : finalLoadingText
                }
                openOnFocus
                openText={translate(openText, { _: openText })}
                id={id}
                isOptionEqualToValue={isOptionEqualToValue}
                filterSelectedOptions
                disabled={disabled || readOnly}
                renderInput={params => {
                    const mergedTextFieldProps = {
                        readOnly,
                        ...params.InputProps,
                        ...TextFieldProps?.InputProps,
                    };
                    const mergedSlotProps = TextFieldProps?.slotProps
                        ? {
                              slotProps: {
                                  ...TextFieldProps?.slotProps,
                                  input: {
                                      readOnly,
                                      ...params.InputProps,
                                      ...TextFieldProps?.slotProps?.input,
                                  },
                              },
                          }
                        : undefined;
                    return (
                        <TextField
                            name={field.name}
                            label={
                                label !== '' && label !== false ? (
                                    <FieldTitle
                                        label={label}
                                        source={source}
                                        resource={resourceProp}
                                        isRequired={isRequired}
                                    />
                                ) : null
                            }
                            error={!!fetchError || invalid}
                            helperText={
                                renderHelperText ? (
                                    <InputHelperText
                                        error={
                                            error?.message ||
                                            fetchError?.message
                                        }
                                        helperText={helperText}
                                    />
                                ) : null
                            }
                            margin={margin}
                            variant={variant}
                            className={clsx({
                                [AutocompleteInputClasses.textField]: true,
                                [AutocompleteInputClasses.emptyLabel]:
                                    label === false || label === '',
                            })}
                            {...params}
                            {...TextFieldProps}
                            InputProps={mergedTextFieldProps}
                            {...mergedSlotProps}
                            size={size}
                            inputRef={handleInputRef}
                            inputProps={{
                                ...params.inputProps,
                                required: isRequired,
                                ...TextFieldProps?.inputProps,
                            }}
                        />
                    );
                }}
                multiple={multiple}
                {...(muiMajor >= 7
                    ? multiple
                        ? { renderValue: renderChips }
                        : {}
                    : { renderTags: renderChips })}
                noOptionsText={
                    typeof noOptionsText === 'string'
                        ? translate(noOptionsText, { _: noOptionsText })
                        : noOptionsText
                }
                selectOnFocus
                clearOnBlur={clearOnBlur}
                {...sanitizeInputRestProps(rest)}
                freeSolo={!!create || !!onCreate}
                open={isOpen && canRenderSuggestions}
                onOpen={handleOpen}
                onClose={handleClose}
                handleHomeEndKeys={!!create || !!onCreate}
                filterOptions={filterOptions}
                options={
                    isPaused && isPlaceholderData
                        ? []
                        : canRenderSuggestions
                          ? suggestions
                          : []
                }
                getOptionKey={(option: any) => option?.id}
                getOptionLabel={getOptionLabelString}
                inputValue={filterValue}
                loading={
                    (isPending &&
                        (!finalChoices || finalChoices.length === 0) &&
                        oneSecondHasPassed) ||
                    (isPaused && isPlaceholderData)
                }
                value={selectedChoice}
                onChange={handleAutocompleteChange}
                onBlur={finalOnBlur}
                onInputChange={handleInputChange}
                renderOption={(props, record: RaRecord) => {
                    const { key: ignoredKey, ...rest } = props;
                    const key = getChoiceValue(record);
                    const optionLabel = getOptionLabel(record, true);

                    return (
                        <li key={key} {...rest}>
                            {optionLabel === '' ? ' ' : optionLabel}
                        </li>
                    );
                }}
                getOptionDisabled={getOptionDisabled}
            />
            {createElement}
        </>
    );
};

const PREFIX = 'RaAutocompleteInput';

export const AutocompleteInputClasses = {
    textField: `${PREFIX}-textField`,
    emptyLabel: `${PREFIX}-emptyLabel`,
};

const StyledAutocomplete = styled(Autocomplete, {
    name: PREFIX,
    overridesResolver: (props, styles) => styles.root,
})(({ theme }) => ({
    [`& .${AutocompleteInputClasses.textField}`]: {
        minWidth: theme.spacing(20),
    },
    [`& .${AutocompleteInputClasses.emptyLabel} .MuiOutlinedInput-root legend`]:
        {
            width: 0,
        },
}));

export interface AutocompleteInputProps<
    OptionType extends any = RaRecord,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    SupportCreate extends boolean | undefined = false,
> extends Omit<CommonInputProps, 'source' | 'onChange'>,
        Omit<ChoicesProps, 'disableValue'>,
        UseSuggestionsOptions,
        Omit<SupportCreateSuggestionOptions, 'handleChange' | 'optionText'>,
        Omit<
            AutocompleteProps<
                OptionType,
                Multiple,
                DisableClearable,
                SupportCreate
            >,
            'onChange' | 'options' | 'renderInput'
        > {
    children?: ReactNode;
    debounce?: number;
    emptyText?: string;
    emptyValue?: any;
    filterToQuery?: (searchText: string) => any;
    inputText?: (option: any) => string;
    offline?: ReactNode;
    onChange?: (
        value: Multiple extends true ? any[] : any,
        record: Multiple extends true ? OptionType[] : OptionType | ''
    ) => void;
    setFilter?: (value: string) => void;
    shouldRenderSuggestions?: any;
    source?: string;
    TextFieldProps?: TextFieldProps;
}

const useSelectedChoice = <
    OptionType extends any = RaRecord,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    SupportCreate extends boolean | undefined = false,
>(
    value: any,
    {
        choices,
        multiple,
        optionValue,
    }: AutocompleteInputProps<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >
) => {
    const selectedChoiceRef = useRef(
        getSelectedItems(choices, value, optionValue, multiple)
    );
    const [selectedChoice, setSelectedChoice] = useState<RaRecord | RaRecord[]>(
        () => getSelectedItems(choices, value, optionValue, multiple)
    );

    useEffect(() => {
        const newSelectedItems = getSelectedItems(
            choices,
            value,
            optionValue,
            multiple
        );

        if (
            !areSelectedItemsEqual(
                selectedChoiceRef.current,
                newSelectedItems,
                optionValue,
                multiple
            )
        ) {
            selectedChoiceRef.current = newSelectedItems;
            setSelectedChoice(newSelectedItems);
        }
    }, [choices, value, multiple, optionValue]);
    return selectedChoice || null;
};

const getSelectedItems = (
    choices: RaRecord[] = [],
    value: any,
    optionValue = 'id',
    multiple: any
) => {
    if (multiple) {
        return (Array.isArray(value ?? []) ? value : [value])
            .map(item =>
                choices.find(
                    choice => String(item) === String(get(choice, optionValue))
                )
            )
            .filter(item => !!item);
    }
    return (
        choices.find(
            choice => String(get(choice, optionValue)) === String(value)
        ) || ''
    );
};

const areSelectedItemsEqual = (
    selectedChoice: RaRecord | RaRecord[],
    newSelectedChoice: RaRecord | RaRecord[],
    optionValue = 'id',
    multiple?: boolean
) => {
    if (multiple) {
        const selectedChoiceArray = (selectedChoice as RaRecord[]) ?? [];
        const newSelectedChoiceArray = (newSelectedChoice as RaRecord[]) ?? [];
        if (selectedChoiceArray.length !== newSelectedChoiceArray.length) {
            return false;
        }
        const equalityArray = selectedChoiceArray.map(choice =>
            newSelectedChoiceArray.some(
                newChoice =>
                    get(newChoice, optionValue) === get(choice, optionValue)
            )
        );
        return !equalityArray.some(item => item === false);
    }
    return (
        get(selectedChoice, optionValue) === get(newSelectedChoice, optionValue)
    );
};

const DefaultFilterToQuery = (searchText: string) => ({ q: searchText });
const defaultOffline = <Offline variant="inline" />;

declare module '@mui/material/styles' {
    interface ComponentNameToClassKey {
        RaAutocompleteInput: 'root' | 'textField';
    }

    interface ComponentsPropsList {
        RaAutocompleteInput: Partial<AutocompleteInputProps>;
    }

    interface Components {
        RaAutocompleteInput?: {
            defaultProps?: ComponentsPropsList['RaAutocompleteInput'];
            styleOverrides?: ComponentsOverrides<
                Omit<Theme, 'components'>
            >['RaAutocompleteInput'];
        };
    }
}
